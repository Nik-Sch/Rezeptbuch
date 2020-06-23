import os
from flask import Flask, request, jsonify, abort, make_response, redirect, url_for, send_from_directory, send_file, session
from flask_restful import Api, Resource, reqparse
from flask_httpauth import HTTPBasicAuth
from flask_compress import Compress
from util import Database
from werkzeug.utils import secure_filename
from requests.auth import HTTPDigestAuth
from datetime import timedelta
import requests
import hashlib
from PIL import Image
from flask_session import Session
from pywebpush import webpush
from uuid import uuid4
import redis
import io
import json
import threading

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
redisNotificationsDB = redis.Redis(host='redis', port=6379, db=0)
redisUniqueRecipeDB = redis.Redis(host='redis', port=6379, db=1)


@auth.get_password
def get_password(username):
    return db.getPassword(username)


@auth.error_handler
def unauthorized():
    # return 403 instead of 401 to prevent default browser dialog
    return make_response(jsonify({'message': 'Unauthorized access'}), 403)


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

@app.route('/status', methods=['GET'])
def status():
    print(str(uuid4()))
    userName = session.get('userName', None)
    if (userName != None):
        return make_response(jsonify({
            'username': userName,
            'write': db.hasWriteAccess(userName)
            }), 200)
    else:
        return unauthorized()

@app.route('/users', methods=['POST'])
def addUser():
    reqParser = reqparse.RequestParser()
    reqParser.add_argument('username', type=str, required=True,
                           help='No username provided',
                           location='json')
    reqParser.add_argument('password', type=str, required=True,
                           help='No password provided',
                           location='json')
    args = reqParser.parse_args()
    if db.addUser(args['username'], args['password']):
        return make_response(jsonify({}), 200)
    else:
        return make_response(jsonify({}), 400)

def notifyNewRecipe(recipe, exclude):
    print('sending notifications, but not to ', exclude)
    for sub in redisNotificationsDB.scan_iter():
        try:
            if sub.decode() == exclude:
                continue
            value = json.loads(redisNotificationsDB.get(sub))
            webpush(subscription_info=value['sub'],
                    data=json.dumps(recipe),
                    vapid_private_key='RHqOa_BNfYzX3awVF30UmDIqVml5NkEbs3AZK31kqDo',
                    vapid_claims={"sub": "mailto:me@niklas-schelten.de"})
            print('sent to: ', sub)
        except Exception as e:
            print('removing sub because of error:', e, sub)
            redisNotificationsDB.delete(sub)


@app.route('/subscriptions/', methods=['POST'])
def addSubscription():
    userName = session.get('userName', None)
    if (userName == None):
        return unauthorized()
    requestData = request.json
    if ('endpoint' in requestData and 'keys' in requestData):
        sessionId = session.get('id', -1)
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
def getUniqueRecipe(uuid):
    if (not redisUniqueRecipeDB.exists(uuid)):
        return make_response('', 404)
    return make_response(jsonify(json.loads(redisUniqueRecipeDB.get(uuid))), 200)

@app.route('/uniqueRecipes', methods=['POST'])
def addUniqueRecipe():
    userName = session.get('userName', None)
    if (userName == None):
        return unauthorized()
    requestData = request.json
    print(requestData)
    uuid = str(uuid4())
    redisUniqueRecipeDB.set(uuid, json.dumps(requestData))
    redisUniqueRecipeDB.expire(uuid, 60 * 60 * 24 * 30) # 30 days valid
    return make_response(jsonify({'createdId': uuid}), 200)

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
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        return db.getAllRecipes(userName)

    def post(self):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 'no write access'}), 405)
        args = self.reqparse.parse_args()
        result = db.insertRecipe(
            userName, args['title'], args['categoryId'], args['ingredients'], args['description'], args['image'])
        if result is not None:
            t = threading.Thread(target=notifyNewRecipe, kwargs={
                                 'recipe': result,
                                 'exclude': session.get('id', -1)
                                 })
            t.start()
            return result
        return make_response(jsonify({'error': 'an error occurred'}), 501)


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

    def get(self, recipeId):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        result = db.getRecipe(userName, recipeId)
        if result is not None:
            return result
        return make_response(jsonify({'error': 'Not found'}), 404)

    def put(self, recipeId):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 405}), 405)
        args = self.reqparse.parse_args()
        print(args)
        result = db.updateRecipe(
            recipeId, userName, args['title'], args['categoryId'], args['ingredients'], args['description'], args['image'])
        if result:
            return make_response('', 200)
        else:
            return make_response(jsonify({'error': 'No recipe updated'}), 404)
        return make_response(jsonify({'error': 'an error occurred'}), 501)

    def delete(self, recipeId):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 405}), 405)
        result = db.deleteRecipe(userName, recipeId, IMAGE_FOLDER)
        if result == 0:
            return make_response("", 404)
        return make_response("", 204)


class RecipeSyncAPI(Resource):
    def __init__(self):
        super(RecipeSyncAPI, self).__init__()

    def get(self, lastChecksum):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        result = db.getUpdateRecipe(userName, lastChecksum)
        if result is not None:
            return result
        return make_response('', 204)


class CategoryListAPI(Resource):
    def __init__(self):
        self.reqparse = reqparse.RequestParser()
        self.reqparse.add_argument('name', type=str, required=True,
                                   help='No title provided',
                                   location='json')
        super(CategoryListAPI, self).__init__()

    def get(self):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        return db.getAllCategories(userName)

    def post(self):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 405}), 405)
        args = self.reqparse.parse_args()
        result = db.insertCategory(userName, args['name'])
        if result is not None:
            return result
        return make_response(jsonify({'error': 'an error occurred'}), 501)


# images
IMAGE_FOLDER = './images/'

class ImageListAPI(Resource):
    def post(self):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        if not db.hasWriteAccess(userName):
            return make_response(jsonify({'error': 405}), 405)
        if 'image' not in request.files:
            return make_response(jsonify({'error': 'No image'}), 400)
        file = request.files['image']
        if file:
            try:
                hash = hashlib.sha256()
                fb = file.read(65536)
                while len(fb) > 0:
                    hash.update(fb)
                    fb = file.read(65536)
                name = hash.hexdigest() + '.jpg'
                jpg = Image.open(file).convert('RGB')
                jpg.save(IMAGE_FOLDER + name)
                response = jsonify({'name': name})
                response.status_code = 201
                response.autocorrect_location_header = False
                return response
            except IOError as e:
                print(e)
                return make_response(jsonify({'error': 'File isn\'t an image'}), 400)


class ImageAPI(Resource):

    def get(self, name):
        try:
            w = int(request.args['w'])
            h = int(request.args['h'])
        except (KeyError, ValueError):
            return send_from_directory(IMAGE_FOLDER, name)

        try:
            im = Image.open(IMAGE_FOLDER + name)
            im.thumbnail((w, h), Image.ANTIALIAS)
            output = io.BytesIO()
            im.save(output, format='JPEG')
            output.seek(0)
            return send_file(output, attachment_filename='img.jpg', mimetype='image/jpeg')
        except IOError:
            abort(404)
        return send_from_directory(IMAGE_FOLDER, name)

    def delete(self, name):
        userName = session.get('userName', None)
        if (userName == None):
            return unauthorized()
        if (os.path.exists(IMAGE_FOLDER + name)):
            os.remove(IMAGE_FOLDER + name)
        return make_response(jsonify(), 200)


api.add_resource(RecipeAPI, '/recipes/<int:recipeId>', endpoint='recipe')
api.add_resource(RecipeListAPI, '/recipes', endpoint='recipes')
api.add_resource(RecipeSyncAPI, '/recipesUpdate/<int:lastChecksum>', endpoint='recipesync')
api.add_resource(CategoryListAPI, '/categories', endpoint='categories')
api.add_resource(ImageListAPI, '/images', endpoint='images')
api.add_resource(ImageAPI, '/images/<string:name>', endpoint='image')

if __name__ == '__main__':
    app.run(debug=True, port=5425, host='0.0.0.0')
