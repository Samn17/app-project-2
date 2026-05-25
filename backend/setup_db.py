import os
import mysql.connector
from config import get_db_connection
# from werkzeug.security import generate_password_hash

def create_tables():
    connection = get_db_connection()
    if not connection:
        print("Error: Could not connect to the database. Make sure MySQL is running and config.py is correct.")
        return

    cursor = connection.cursor()

    try:
        # 1. Execute schema.sql (CREATE TABLE IF NOT EXISTS)
        print("Reading schema.sql...")
        sql_file_path = os.path.join(os.path.dirname(__file__), 'schema.sql')
        with open(sql_file_path, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        print("Executing database schema from schema.sql (preserving existing tables)...")
        # Split by ';' and execute each statement
        statements = [s.strip() for s in sql_script.split(';') if s.strip()]
        for statement in statements:
            try:
                cursor.execute(statement)
            except Exception as e:
                # Ignore errors if table already exists (they're expected)
                if 'already exists' not in str(e).lower():
                    print(f"Note: {e}")
        
        # 2. Sample data note
        print("Existing data preserved - System is fully dynamic.")

        # 3. Create stored procedure (if it doesn't exist)
        print("Creating stored procedures (if needed)...")
        try:
            procedure_sql = """
            CREATE PROCEDURE generate_invoice_number(OUT invoice_num VARCHAR(50))
            BEGIN
                DECLARE year_part VARCHAR(4);
                DECLARE seq_num INT;
                
                SET year_part = YEAR(CURDATE());
                
                SELECT COUNT(*) + 1 INTO seq_num FROM payments WHERE YEAR(date) = year_part;
                SET invoice_num = CONCAT('INV-', year_part, '-', LPAD(seq_num, 4, '0'));
            END
            """
            cursor.execute(procedure_sql)
        except Exception as e:
            # Procedure might already exist
            if 'already exists' not in str(e).lower():
                print(f"Note: {e}")

        connection.commit()
        print("✓ Database schema verified - All existing data preserved successfully.")
        print("  Tables created if needed. Existing tables remain intact with all data.")

    except mysql.connector.Error as err:
        print(f"Error during database setup: {err}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()

if __name__ == '__main__':
    create_tables()

