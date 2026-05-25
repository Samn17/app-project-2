import mysql.connector
from mysql.connector import Error

class Config:
    SECRET_KEY = "medicare_secret_key_123"
    DB_CONFIG = {
        'host': 'localhost',
        'user': 'root',
        'password': 'saman17@1234', # Update this with your MySQL password
        'database': 'hospital'
    }

def get_db_connection():
    try:
        connection = mysql.connector.connect(**Config.DB_CONFIG)
        if connection.is_connected():
            return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None
