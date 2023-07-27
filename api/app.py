import os
from typing import Any, Literal, OrderedDict
from flask import Flask, request, jsonify, abort, make_response, send_from_directory, send_file, session, Response
from flask_restful import Api, Resource, reqparse
from flask_httpauth import HTTPBasicAuth
from flask_compress import Compress
from util import Database
from datetime import timedelta
import hashlib
from PIL import Image
from flask_session import Session
from pywebpush import webpush
from uuid import uuid4
import redis
import io
import json
import threading
from passlib.hash import pbkdf2_sha256

app = Flask(__name__)
app.secret_key = bytes(os.environ["FLASK_KEY"],
                       "utf-8").decode('unicode_escape')
app.config['SESSION_TYPE'] = 'redis'
app.config['SESSION_REDIS'] = redis.Redis(host='redis', port=6379, db=2)
app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=365)
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 365*24*60*60


api = Api(app)
Compress(app)
auth = HTTPBasicAuth()
db = Database()

Session(app)
redisNotificationsDB = redis.StrictRedis(host='redis', port=6379, db=0)
redisUniqueRecipeDB = redis.StrictRedis(host='redis', port=6379, db=1)
redisShoppingListDB = redis.StrictRedis(host='redis', port=6379, db=2)

checksumRequestParser = reqparse.RequestParser()
checksumRequestParser.add_argument('checksum', type=int, required=False,
                           help='No checksum provided', location='args')


@auth.verify_password
def verify_password(username: str, password: str):
    hash = db.getPasswordHash(username)
    if hash == None:
        return False
    return pbkdf2_sha256.verify(password, hash)

# remove the www-authenticate header to avoid browsers opening basic auth dialogs
@app.after_request
def remove_header(response):
    del response.headers['www-authenticate']

    return response

@auth.error_handler
def unauthorized():
    session['userName'] = None
    session['id'] = None
    return make_response(jsonify({'message': 'Unauthorized access'}), 401)


@app.route('/login', methods=['GET'])
@auth.login_required
def login():
    session['userName'] = auth.username()
    session['id'] = str(uuid4())
    return make_response(jsonify({'message': 'Logged in'}), 200)

@app.route('/logout', methods=['GET'])
def logout():
    session['userName'] = None
    session['id'] = None
    return make_response(jsonify({}), 200)

def sessionGet(key: Literal['userName', 'id'], default: Any = None):
    return session.get(key, default)  # type: ignore

@app.route('/status', methods=['GET'])
def status():
    userName = sessionGet('userName')
    if userName != None:
        return make_response(jsonify({
            'username': userName,
            'write': db.hasWriteAccess(userName)
            }), 200)
    else:
        return unauthorized()


def shoppinglist_stream(list_id: str):
    data = redisShoppingListDB.hvals(list_id)
    data = [json.loads(x) for x in data]
    yield 'data: %s\n\n' % json.dumps(data)
    pubsub = redisShoppingListDB.pubsub()
    pubsub.subscribe(list_id)
    print('starting')
    for message in pubsub.listen():
        if message['type'] == 'message':
            m = json.loads(message['data'])
            yield 'data: %s\n\n' % m['data']

def verifyShoppingListJson(requestJson: Any):
    if not isinstance(requestJson, list):
        return make_response(jsonify({'error': 'Expected an array'}), 400)
    for item in requestJson:
        if not 'id' in item:
            return make_response(jsonify({'error': 'Each element requires id'}), 400)
        if not 'text' in item:
            return make_response(jsonify({'error': 'Each element requires text'}), 400)
        if not 'checked' in item:
            return make_response(jsonify({'error': 'Each element requires checked'}), 400)
        if not 'position' in item:
            return make_response(jsonify({'error': 'Each element requires position'}), 400)
        if not 'addedTime' in item:
            return make_response(jsonify({'error': 'Each element requires addedTime'}), 400)
    return True

def handleShoppingList(list_id: str):
    requestJson: Any = request.json
    if request.method == 'GET':
        resp = Response(shoppinglist_stream(list_id),
                                mimetype="text/event-stream")
        resp.headers['X-Accel-Buffering'] = 'No'
        resp.headers['Cache-Control'] = 'no-transform' # for npm dev
        return resp
    elif request.method == 'POST' or request.method == 'PUT':
        verify = verifyShoppingListJson(requestJson)
        if verify != True:
            return verify
        for item in requestJson:
            redisShoppingListDB.hset(list_id, item['id'], json.dumps(item))
    elif request.method == 'DELETE':
        verify = verifyShoppingListJson(requestJson)
        if verify != True:
            return verify
        for item in requestJson:
            redisShoppingListDB.hdel(list_id, item['id'])
    data = redisShoppingListDB.hvals(list_id)
    data = [json.loads(x) for x in data]
    toPublish = {}
    toPublish['data'] = json.dumps(data)
    redisShoppingListDB.publish(list_id, json.dumps(toPublish))
    return make_response('', 200)

@app.route('/shoppingList', methods=['GET', 'POST', 'PUT', 'DELETE'])
def privateShoppingList():
    user_name = sessionGet('userName')
    if (user_name != None):
        return handleShoppingList(user_name)
    else:
        return unauthorized()

@app.route('/shoppingLists/<string:list_id>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def publicShoppingList(list_id: str):
    return handleShoppingList(list_id)

@app.route('/webpush_public_key', methods=['GET'])
def get_push_public_key():
    return make_response(jsonify({'public_key': os.environ['PUSH_PUBLIC_KEY']}), 200)


def notifyNewRecipe(recipe: OrderedDict[str, Any], exclude: int):
    print('sending notifications, but not to ', exclude)
    for sub in redisNotificationsDB.scan_iter():
        try:
            if sub.decode() == exclude:
                continue
            value = json.loads(redisNotificationsDB.get(sub))  # type: ignore
            webpush(subscription_info=value['sub'],
                    data=json.dumps(recipe),
                    vapid_private_key=os.environ['PUSH_PRIVATE_KEY'],
                    vapid_claims={"sub": "mailto:mail@niklas-schelten.de"})
            print('sent to: ', sub)
        except Exception as e:
            print('removing sub because of error:', e, sub)
            redisNotificationsDB.delete(sub)


@app.route('/subscriptions/', methods=['POST'])
def addSubscription():
    userName = sessionGet('userName')
    if (userName == None):
        return unauthorized()
    requestData = request.json
    if ('endpoint' in requestData and 'keys' in requestData):
        sessionId = sessionGet('id', -1)
        try:
            subscription = {}
            subscription['sub'] = requestData
            subscription['userName'] = userName
            redisNotificationsDB.set(sessionId, json.dumps(subscription))
            print('subscribed', sessionId)
            return make_response("", 200)
        except Exception as e:
            print('dunno', e)
    return make_response(jsonify({'error': 'no endpoint or keys in subscription or something else'}), 400)


@app.route('/uniqueRecipes/<string:uuid>', methods=['GET'])
def getUniqueRecipe(uuid: str):
    if (not redisUniqueRecipeDB.exists(uuid)):
        return make_response('', 404)
    return make_response(jsonify(json.loads(redisUniqueRecipeDB.get(uuid))), 200)  # type: ignore

@app.route('/uniqueRecipes', methods=['POST'])
def addUniqueRecipe():
    userName = sessionGet('userName')
    if (userName == None):
        return unauthorized()
    requestData = request.json
    uuid = str(uuid4())
    redisUniqueRecipeDB.set(uuid, json.dumps(requestData))
    redisUniqueRecipeDB.expire(uuid, 60 * 60 * 24 * 30) # 30 days valid
    return make_response(jsonify({'createdId': uuid}), 200)

class UserListAPI(Resource):
    def get(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        args = checksumRequestParser.parse_args()
        return db.getUsers(userName, args['checksum'])


    def post(self):
        reqParser = reqparse.RequestParser()
        reqParser.add_argument('username', type=str, required=True,
                            help='No username provided',
                            location='json')
        reqParser.add_argument('password', type=str, required=True,
                            help='No password provided',
                            location='json')
        args = reqParser.parse_args()
        if len(args['username']) < 3:
            return make_response(jsonify({"message": "The username is too short (3 chars minimum)."}), 400)
        if len(args['password']) < 8:
            return make_response(jsonify({"message": "The password is too short (8 chars minimum)."}), 400)
        if db.addUser(args['username'], args['password']):
            return make_response(jsonify({}), 200)
        else:
            return make_response(jsonify({"message": "The username already exists, try another one."}), 409)

class CommentListAPI(Resource):
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('text', type=str, required=True,
                                   help='No text provided',
                                   location='json')
        self.reqparse.add_argument('recipeId', type=int, required=True,
                                   help='No recipe provided',
                                   location='json')

    def get(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        args = checksumRequestParser.parse_args()
        return db.getComments(userName, args['checksum'])

    def post(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        args = self.reqparse.parse_args()
        try:
            return db.addComment(userName, args['text'], args['recipeId'])
        except Exception as e:
            return make_response(jsonify({'error': str(e)}), 500)

class CommentAPI(Resource):
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('text', type=str, required=True,
                                   help='No text provided',
                                   location='json')

    def get(self, commentId: int):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        result = db.getComment(userName, commentId)
        if result is not None:
            return result
        return make_response(jsonify({'error': 'Not found'}), 404)
        return
    
    def put(self, commentId: int):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        args = self.reqparse.parse_args()
        if db.updateComment(userName, commentId, args['text']):
            return make_response('', 200)
        else:
            return make_response(jsonify({'error': 'No comment updated'}), 404)

    def delete(self, commentId: int):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        result = db.deleteComment(userName, commentId)
        if result == 0:
            return make_response("", 404)
        return make_response("", 204)


class RecipeListAPI(Resource):
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('title', type=str, required=True,
                                   help='No title provided',
                                   location='json')
        self.reqparse.add_argument('categoryId', type=int, required=True,
                                   help='No category provided',
                                   location='json')
        self.reqparse.add_argument('ingredients', type=str, required=True,
                                   help='No ingredients provided',
                                   location='json')
        self.reqparse.add_argument('description', type=str, required=True,
                                   help='No description provided',
                                   location='json')
        self.reqparse.add_argument('image', type=str, required=False,
                                   location='json')
        super(RecipeListAPI, self).__init__()

    def get(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        args = checksumRequestParser.parse_args()
        return db.getRecipes(userName, args['checksum'])

    def post(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        args = self.reqparse.parse_args()
        result = db.insertRecipe(
            userName, args['title'], args['categoryId'], args['ingredients'], args['description'], args['image'])
        if result is not None:
            t = threading.Thread(target=notifyNewRecipe, kwargs={
                                 'recipe': result,
                                 'exclude': sessionGet('id', -1)
                                 })
            t.start()
            return result
        return make_response(jsonify({'error': 'The recipe has not been inserted'}), 500)


class RecipeAPI(Resource):
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('title', type=str, required=True,
                                   help='No title provided',
                                   location='json')
        self.reqparse.add_argument('categoryId', type=int, required=True,
                                   help='No category provided',
                                   location='json')
        self.reqparse.add_argument('ingredients', type=str, required=True,
                                   help='No ingredients provided',
                                   location='json')
        self.reqparse.add_argument('description', type=str, required=True,
                                   help='No description provided',
                                   location='json')
        self.reqparse.add_argument('image', type=str, required=False,
                                   location='json')

        super(RecipeAPI, self).__init__()

    def get(self, recipeId: int):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        result = db.getRecipe(userName, recipeId)
        if result is not None:
            return result
        return make_response(jsonify({'error': 'Not found'}), 404)

    def put(self, recipeId: int):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        args = self.reqparse.parse_args()
        result = db.updateRecipe(
            recipeId, userName, args['title'], args['categoryId'], args['ingredients'], args['description'], args['image'])
        if result:
            return make_response('', 200)
        else:
            return make_response(jsonify({'error': 'No recipe updated'}), 404)

    def delete(self, recipeId: int):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        result = db.deleteRecipe(userName, recipeId, IMAGE_FOLDER)
        if result == 0:
            return make_response("", 404)
        return make_response("", 204)


class CategoryListAPI(Resource):
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('name', type=str, required=True,
                                   help='No title provided',
                                   location='json')
        super(CategoryListAPI, self).__init__()

    def get(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        args = checksumRequestParser.parse_args()
        return db.getCategories(userName, args['checksum'])

    def post(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        args = self.reqparse.parse_args()
        result = db.insertCategory(userName, args['name'])
        if result is not None:
            return result
        return make_response(jsonify({'error': 'an error occurred'}), 501)


# images
IMAGE_FOLDER = '../images/'

class ImageListAPI(Resource):
    def post(self):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 403)
        if 'image' not in request.files:
            return make_response(jsonify({'error': 'No image'}), 400)
        file = request.files['image']  # type: ignore
        if file:
            try:
                hash = hashlib.sha256()
                fb = file.read(65536)
                while len(fb) > 0:
                    hash.update(fb)
                    fb = file.read(65536)
                name = hash.hexdigest() + '.jpg'
                jpg = Image.open(file).convert('RGB')
                try:
                    exif = jpg.info['exif']
                    jpg.save(IMAGE_FOLDER + name, exif=exif)
                except:
                    jpg.save(IMAGE_FOLDER + name)
                response = jsonify({'name': name})
                response.status_code = 201
                response.autocorrect_location_header = False
                return response
            except IOError as e:
                return make_response(jsonify({'error': 'File isn\'t an image'}), 400)


class ImageAPI(Resource):

    def get(self, name: str):
        try:
            w = int(request.args['w'])  # type: ignore
            h = int(request.args['h'])  # type: ignore
        except (KeyError, ValueError):
            return send_from_directory(IMAGE_FOLDER, name)

        try:
            im = Image.open(IMAGE_FOLDER + name)
            im.thumbnail((w, h), Image.ANTIALIAS)
            output = io.BytesIO()
            try:
                im.save(output, format='JPEG', exif=im.info['exif'])
            except:
                im.save(output, format='JPEG')
            output.seek(0)
            return send_file(output, attachment_filename='img.jpg', mimetype='image/jpeg')
        except IOError:
            abort(404)

    def delete(self, name: str):
        userName = sessionGet('userName')
        if (userName == None):
            return unauthorized()
        if (os.path.exists(IMAGE_FOLDER + name)):
            os.remove(IMAGE_FOLDER + name)
        return make_response(jsonify(), 200)


api.add_resource(UserListAPI, '/users', endpoint='users')
api.add_resource(RecipeListAPI, '/recipes', endpoint='recipes')
api.add_resource(RecipeAPI, '/recipes/<int:recipeId>', endpoint='recipe')
api.add_resource(CommentListAPI, '/comments', endpoint='comments')
api.add_resource(CommentAPI, '/comments/<int:commentId>', endpoint='comment')
api.add_resource(CategoryListAPI, '/categories', endpoint='categories')
api.add_resource(ImageListAPI, '/images', endpoint='images')
api.add_resource(ImageAPI, '/images/<string:name>', endpoint='image')

if __name__ == '__main__':
    app.run(debug=True, port=5425, host='0.0.0.0')
