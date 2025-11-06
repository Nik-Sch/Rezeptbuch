import logging
import os

import pymysql
from flask import make_response
from flask_restful import fields, marshal
from passlib.hash import pbkdf2_sha256
from rich.console import Console
from rich.logging import RichHandler

logger = logging.getLogger("recipes.util")
logger.handlers = [RichHandler(logging.INFO, markup=True, console=Console(width=250))]
logger.setLevel(logging.INFO)


class Database:

    __recipeFields = {
        "id": fields.Integer,
        "title": fields.String,
        "categoryId": fields.Integer,
        "ingredients": fields.String,
        "description": fields.String,
        "image": fields.String,
        "date": fields.DateTime,
        "userId": fields.Integer,
    }

    __categoryFields = {
        "id": fields.Integer,
        "name": fields.String,
        "userId": fields.Integer,
    }

    __userFields = {
        "id": fields.Integer,
        "user": fields.String,
        "readOnly": fields.Boolean,
    }

    __commentFields = {
        "id": fields.Integer,
        "text": fields.String,
        "userId": fields.Integer,
        "recipeId": fields.Integer,
        "date": fields.DateTime,
        "editedDate": fields.DateTime,
    }

    def __init__(self):
        self.connect()

    def connect(self, username=None):
        conn = pymysql.connect(
            host=os.environ["MYSQL_HOST"],
            user=os.environ["MYSQL_USER"],
            passwd=os.environ["MYSQL_PASSWORD"],
            db=os.environ["MYSQL_DATABASE"],
            charset="utf8mb4",
            cursorclass=pymysql.cursors.DictCursor,
        )
        if username is not None:
            cur = conn.cursor()
            cur.execute("SELECT id, user, groupId FROM user;")
            userId = -1
            groupId = -1
            for res in cur.fetchall():
                if res["user"] == username:
                    userId = res["id"]
                    groupId = res["groupId"]
                    break
            return conn, userId, groupId
        else:
            return conn, -1, -1

    def getUsers(self, username, lastChecksum):
        conn, _, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute("CHECKSUM TABLE `user`")
            res = cur.fetchone()
            checksum = res["Checksum"]
            if lastChecksum == checksum:
                return make_response("", 204)

            cur.execute(
                "SELECT `id`, `user`, `readOnly` FROM `user` WHERE `groupId` = %s;",
                [groupId],
            )
            users = []
            for res in cur.fetchall():
                users.append(marshal(res, self.__userFields))

            cur.execute("CHECKSUM TABLE `user`;")
            res = cur.fetchone()
            checksum = res["Checksum"]
            return {"users": users, "checksum": checksum}
        finally:
            conn.close()

    def getRecipes(self, username, lastChecksum):
        conn, userId, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute("CHECKSUM TABLE `recipe`")
            res = cur.fetchone()
            checksum = res["Checksum"]
            if lastChecksum == checksum:
                return make_response("", 204)

            cur.execute(
                "SELECT `recipe`.* FROM `recipe` JOIN `user` ON `recipe`.`userId` = `user`.`id` WHERE `groupId` = %s;",
                [groupId],
            )
            recipes = []
            for res in cur.fetchall():
                recipes.append(marshal(res, self.__recipeFields))

            cur.execute("CHECKSUM TABLE `recipe`;")
            res = cur.fetchone()
            checksum = res["Checksum"]
            return {"recipes": recipes, "checksum": checksum}
        finally:
            conn.close()

    def getRecipe(self, recipeId):
        conn, _, _ = self.connect()
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT * FROM `recipe`  WHERE `id` = %s;",
                [recipeId],
            )
            return marshal(cur.fetchone(), self.__recipeFields)
        finally:
            conn.close()

    def insertRecipe(self, username, title, category, ingredients, description, image):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            if not image:
                image = ""
            query = "INSERT INTO recipe(title, categoryId, ingredients, description, image, userId) VALUES (%s, %s, %s, %s, %s, %s);"
            cur.execute(
                query, [title, category, ingredients, description, image, userId]
            )
            cur.execute("SELECT LAST_INSERT_ID() as id;")
            id = cur.fetchone()["id"]
            cur.execute("SELECT * FROM recipe WHERE id = %s;", [id])
            res = cur.fetchone()
            return marshal(res, self.__recipeFields)
        finally:
            conn.commit()
            conn.close()

    def updateRecipe(
        self, recipeId, username, title, category, ingredients, description, image
    ):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            query = "UPDATE `recipe` SET `title` = %s, `categoryId` = %s, `ingredients` = %s,`description` = %s, `image` = %s WHERE `id` = %s AND `userId` = %s;"
            if (
                cur.execute(
                    query,
                    [
                        title,
                        category,
                        ingredients,
                        description,
                        image,
                        recipeId,
                        userId,
                    ],
                )
                == 1
            ):
                return True
            else:
                cur.execute(
                    "SELECT COUNT(*) as c FROM `recipe` WHERE `id` = %s AND `userId` = %s;",
                    [recipeId, userId],
                )
                return cur.fetchone()["c"] == 1
        finally:
            conn.commit()
            conn.close()

    def deleteRecipe(self, username, _id, IMAGE_FOLDER):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT `image` FROM `recipe` WHERE `id` = %s AND userId = %s;",
                [_id, userId],
            )
            try:
                img = cur.fetchone()["image"]
                if os.path.exists(IMAGE_FOLDER + img):
                    os.remove(IMAGE_FOLDER + img)
            except Exception as e:
                logger.info(e)
            return cur.execute(
                "DELETE FROM `recipe` WHERE `id` = %s AND `userId` = %s", [_id, userId]
            )
        finally:
            conn.commit()
            conn.close()

    def getComments(self, username, lastChecksum):
        conn, userId, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute("CHECKSUM TABLE `comment`")
            res = cur.fetchone()
            checksum = res["Checksum"]
            if lastChecksum == checksum:
                return make_response("", 204)

            cur.execute(
                "SELECT `comment`.* FROM `comment` JOIN `user` ON `comment`.`userId` = `user`.`id` WHERE `groupId` = %s;",
                [groupId],
            )
            comments = []
            for res in cur.fetchall():
                comments.append(marshal(res, self.__commentFields))

            cur.execute("CHECKSUM TABLE `comment`;")
            res = cur.fetchone()
            checksum = res["Checksum"]
            return {"comments": comments, "checksum": checksum}
        finally:
            conn.close()

    def getComment(self, username, commentId):
        conn, userId, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute(
                "SELECT `comment`.* FROM `comment` JOIN `user` ON `comment`.`userId` = `user`.`id` WHERE `groupId` = %s and `comment`.`id` = %s;",
                [groupId, commentId],
            )
            comment = None
            for res in cur.fetchall():
                comment = marshal(res, self.__commentFields)
            if comment is not None:
                return {"comment": comment}
            else:
                return None
        finally:
            conn.close()

    def addComment(self, username, text, recipeId):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()  # todo: check if we are in the group
            cur.execute(
                "INSERT INTO comment(text, userId, recipeId) VALUES (%s, %s, %s);",
                [text, userId, recipeId],
            )
            cur.execute("SELECT LAST_INSERT_ID() as id;")
            id = cur.fetchone()["id"]
            cur.execute("SELECT * FROM comment WHERE id = %s;", [id])
            res = cur.fetchone()
            return marshal(res, self.__commentFields)
        finally:
            conn.commit()
            conn.close()

    def updateComment(self, username, commentId, text):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            query = "UPDATE `comment` SET `text` = %s, `editedDate` = CURRENT_TIMESTAMP() WHERE `id` = %s AND `userId` = %s;"
            logger.info(f"{query=}, {text=}, {commentId=}, {userId=}")
            if cur.execute(query, [text, commentId, userId]) == 1:
                return True
            else:
                cur.execute(
                    "SELECT COUNT(*) as c FROM `recipe` WHERE `id` = %s AND `userId` = %s;",
                    [commentId, userId],
                )
                return cur.fetchone()["c"] == 1
        finally:
            conn.commit()
            conn.close()

    def deleteComment(self, username, id):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            return cur.execute(
                "DELETE FROM `comment` WHERE `id` = %s AND `userId` = %s", [id, userId]
            )
        finally:
            conn.commit()
            conn.close()

    def getCategories(self, username, lastChecksum):
        conn, userId, groupId = self.connect(username)
        try:
            cur = conn.cursor()
            cur.execute("CHECKSUM TABLE `category`")
            res = cur.fetchone()
            checksum = res["Checksum"]
            if lastChecksum == checksum:
                return make_response("", 204)

            cur.execute(
                "SELECT `category`.* FROM `category` JOIN `user` ON `category`.`userId`= `user`.`id` WHERE `user`.`groupId` = %s;",
                [groupId],
            )
            categories = []
            for res in cur.fetchall():
                categories.append(marshal(res, self.__categoryFields))

            cur.execute("CHECKSUM TABLE `category`;")
            res = cur.fetchone()
            checksum = res["Checksum"]
            return {"categories": categories, "checksum": checksum}
        finally:
            conn.close()

    def insertCategory(self, username, name):
        conn, userId, _ = self.connect(username)
        try:
            cur = conn.cursor()
            query = "INSERT INTO category(name, userId) VALUES (%s, %s);"
            logger.info(f"{query=}, [{name=}, {userId=}]")
            cur.execute(query, [name, userId])
            cur.execute("SELECT LAST_INSERT_ID() as id;")
            return {"id": cur.fetchone()["id"]}
        finally:
            conn.commit()
            conn.close()

    # authentication
    def getPasswordHash(self, username):
        conn, _, _ = self.connect()
        try:
            cur = conn.cursor()
            cur.execute("SELECT `encrypted` FROM `user` WHERE `user` = %s;", [username])
            for res in cur.fetchall():
                return res["encrypted"]
        finally:
            conn.close()

    def addUser(self, username, pwd):
        conn, _, _ = self.connect()
        try:
            hash = pbkdf2_sha256.hash(pwd)
            cur = conn.cursor()
            query = "INSERT INTO `user` (`user`, `encrypted`, `readOnly`) VALUES (%s, %s, '0');"
            if cur.execute(query, [username, hash]) == 1:
                return True
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
                return res["readOnly"] == 0
            return False
        finally:
            conn.close()
