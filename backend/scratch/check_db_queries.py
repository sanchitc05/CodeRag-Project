import pymysql
import os
from sqlalchemy.engine import make_url

MYSQL_URL = "mysql+pymysql://coderag_user:coderag_pass@127.0.0.1:3307/coderag"

def check_db():
    try:
        conn = pymysql.connect(
            host='127.0.0.1',
            port=3307,
            user='coderag_user',
            password='coderag_pass',
            database='coderag'
        )
        with conn.cursor() as cursor:
            cursor.execute("SHOW TABLES")
            print("Tables:", cursor.fetchall())
            
            cursor.execute("SELECT repo_id, query FROM query_history LIMIT 5")
            print("Recent Queries:", cursor.fetchall())
        conn.close()
    except Exception as e:
        print("Error:", e)

if __name__ == "__main__":
    check_db()
