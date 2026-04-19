from sqlalchemy import text
from app.database import engine

def migrate():
    with engine.connect() as conn:
        print("Adding username and full_name columns to users table...")
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN username VARCHAR(255) UNIQUE AFTER email"))
            print("Added username column")
        except Exception as e:
            print(f"Error adding username column (might already exist): {e}")
            
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN full_name VARCHAR(255) AFTER username"))
            print("Added full_name column")
        except Exception as e:
            print(f"Error adding full_name column (might already exist): {e}")
            
        conn.commit()
    print("Migration complete.")

if __name__ == "__main__":
    migrate()
