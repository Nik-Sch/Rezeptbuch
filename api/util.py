import pymysql
import base64
import pysodium
import os
from flask_restful import fields, marshal
from dateutil import parser


class Database:

    __recipeFields = {
        'id': fields.Integer,
        'title': fields.String,
        'categoryId': fields.Integer,
        'ingredients': fields.String,
        'description': fields.String,
        'image': fields.String,
        'date': fields.DateTime,
        'userId': fields.Integer
    }

    __categoryFields = {
        'id': fields.Integer,
        'name': fields.String,
        'userId': fields.Integer
    }

    __userFields = {
        'id': fields.Integer,
        'user': fields.String,
        'readOnly': fields.Boolean
    }

    def __init__(self):
        self.connect()

    def connect(self, username = None):
        conn = pymysql.connect(host=os.environ['MYSQL_HOST'],
                               user=os.environ['MYSQL_USER'],
                               passwd=os.environ['MYSQL_PASSWORD'],
                               db=os.environ['MYSQL_DATABASE'],
                               charset='utf8mb4',
                               cursorclass=pymysql.cursors.DictCursor)
        if username != None:
            cur = conn.cursor()
            cur.execute("SELECT id, user, groupId FROM user;")
            userId = -1
            groupId = -1
            for res in cur.fetchall():
                if res['user'] == username:
                    userId = res['id']
                    groupId = res['groupId']
                    break
            return conn, userId, groupId
        else:
            return conn, -1, -1

    def getAllRecipes(self, username):
        conn, userId, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT `recipe`.* FROM `recipe` JOIN `user` ON `recipe`.`userId` = `user`.`id` WHERE `groupId` = %s;", [groupId])
            recipes = []
            for res in cur.fetchall():
                recipes.append(marshal(res, self.__recipeFields))

            cur.execute(
                "SELECT `category`.* FROM `category` JOIN `user` ON `category`.`userId` = `user`.`id` WHERE `user`.`groupId` = %s;", [groupId])
            categories = []
            for res in cur.fetchall():
                categories.append(marshal(res, self.__categoryFields))

            cur.execute("SELECT `id`, `user`, `readOnly` FROM `user` WHERE `groupId` = %s;", [groupId])
            users = []
            for res in cur.fetchall():
                users.append(marshal(res, self.__userFields))

            cur.execute("CHECKSUM TABLE `recipe`;")
            res = cur.fetchone()
            checksum = res['Checksum']
            return {'recipes': recipes, 'categories': categories, 'users': users, 'checksum': checksum}
        finally:
            conn.close()

    def getRecipe(self, username, rid):
        conn, userId, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT `recipe`.* FROM `recipe` JOIN `user` ON `recipe`.`userId` = `user`.`id` WHERE `groupId` = %s and `recipe`.`id` = %s;", [groupId, rid])
            recipe = 0
            for res in cur.fetchall():
                recipe = marshal(res, self.__recipeFields)
            if recipe != 0:
                return {'recipe': recipe}
            else:
                return None
        finally:
            conn.close()

    def getUpdateRecipe(self, username, lastChecksum):
        conn, _, _ = self.connect()
        try:
            cur = conn.cursor()
            cur.execute("CHECKSUM TABLE `recipe`")
            res = cur.fetchone()
            checksum = res['Checksum']
            if (lastChecksum != checksum):
                return self.getAllRecipes(username)
        finally:
            conn.close()

    def insertRecipe(self, username, title, category, ingredients, description, image):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            if not image:
                image = ""
            query = "INSERT INTO recipe(title, categoryId, ingredients, description, image, userId) VALUES (%s, %s, %s, %s, %s, %s);"
            cur.execute(query, [title, category, ingredients, description, image, userId])
            # print(query)
            cur.execute("SELECT LAST_INSERT_ID() as id;")
            id = cur.fetchone()['id']
            cur.execute("SELECT * FROM recipe WHERE id = %s;", [id])
            res = cur.fetchone()
            return marshal(res, self.__recipeFields)
        finally:
            conn.commit()
            conn.close()

    def updateRecipe(self, recipeId, username, title, category, ingredients, description, image):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            query = "UPDATE `recipe` SET `title` = %s, `categoryId` = %s, `ingredients` = %s,`description` = %s, `image` = %s WHERE `id` = %s AND `userId` = %s;"
            if cur.execute(query, [title, category, ingredients, description, image, recipeId, userId]) == 1:
                return True
            else:
                cur.execute(
                    "SELECT COUNT(*) as c FROM `recipe` WHERE `id` = %s AND `userId` = %s;", [recipeId, userId])
                return cur.fetchone()['c'] == 1
        finally:
            conn.commit()
            conn.close()

    def deleteRecipe(self, username, _id, IMAGE_FOLDER):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute("SELECT `image` FROM `recipe` WHERE `id` = %s AND userId = %s;", [_id, userId])
            try:
                img = cur.fetchone()["image"]
                if (os.path.exists(IMAGE_FOLDER + img)):
                    os.remove(IMAGE_FOLDER + img)
            except Exception as e:
                print(e)
            return cur.execute("DELETE FROM `recipe` WHERE `id` = %s AND `userId` = %s", [_id, userId])
        finally:
            conn.commit()
            conn.close()

    def getAllCategories(self, username):
        conn, userId, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute("SELECT `category`.* FROM `category` JOIN `user` ON `category`.`userId`= `user`.`id` WHERE `user`.`groupId` = %s;", [groupId])
            categories = []
            for res in cur.fetchall():
                categories.append(marshal(res, self.__categoryFields))
            return {'categories': categories}
        finally:
            conn.close()

    def insertCategory(self, username, name):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            query = "INSERT INTO category(name, userId) VALUES (%s, %s);"
            print(query, [name, userId])
            cur.execute(query, [name, userId])
            cur.execute("SELECT LAST_INSERT_ID() as id;")
            return {'id': cur.fetchone()['id']}
        finally:
            conn.commit()
            conn.close()


# authentication

    def __encrypt(self, pwd):
        key = base64.b64decode(os.environ["ENCRYPTION_KEY"])
        nonce = pysodium.randombytes(pysodium.crypto_secretbox_NONCEBYTES)
        encrypted = nonce + pysodium.crypto_secretbox(pwd.encode(), nonce, key)
        return base64.b64encode(encrypted).decode()

    def __decrypt(self, encrypted):
        key = base64.b64decode(os.environ["ENCRYPTION_KEY"])
        decoded = base64.b64decode(encrypted)
        nonce = decoded[:pysodium.crypto_secretbox_NONCEBYTES]
        ciph = decoded[pysodium.crypto_secretbox_NONCEBYTES:]
        return pysodium.crypto_secretbox_open(ciph, nonce, key).decode()

    def getPassword(self, username):
        conn, _, _ = self.connect()
        try:
            cur = conn.cursor()
            cur.execute("SELECT `encrypted` FROM `user` WHERE `user` = %s;", [username])
            for res in cur.fetchall():
                return self.__decrypt(res['encrypted'])
        finally:
            conn.close()

    def addUser(self, username, pwd):
        conn, _, _ = self.connect()
        try:
            encrypted = self.__encrypt(pwd)
            cur = conn.cursor()
            query = "INSERT INTO `user` (`user`, `encrypted`, `readOnly`) VALUES (%s, %s, '0');"
            if cur.execute(query, [username, encrypted]) == 1:
                return True
        except:
            return False
        finally:
            conn.commit()
            conn.close()
        return False

    def hasWriteAccess(self, username):
        conn, _, _ = self.connect()
        try:
            cur = conn.cursor()
            cur.execute("SELECT `readOnly` FROM `user` WHERE `user` = %s;", [username])
            for res in cur.fetchall():
                return res['readOnly'] == 0
            return False
        finally:
            conn.close()
