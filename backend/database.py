import decimal
import datetime
from config import get_db_connection

def serialize_result(val):
    """
    Recursively clean query results to make them JSON serializable.
    Converts Decimals to floats, Dates/Times/Timestamps to strings,
    and Timedelta objects (MySQL TIME) to 'HH:MM:SS' strings.
    """
    if isinstance(val, decimal.Decimal):
        return float(val)
    elif isinstance(val, (datetime.date, datetime.datetime)):
        return str(val)
    elif isinstance(val, datetime.timedelta):
        total_seconds = int(val.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        seconds = total_seconds % 60
        return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
    elif isinstance(val, list):
        return [serialize_result(item) for item in val]
    elif isinstance(val, dict):
        return {k: serialize_result(v) for k, v in val.items()}
    return val

def db_query(query, params=None, fetch=False, commit=False):
    conn = get_db_connection()
    if not conn:
        raise Exception("Database connection failed")
    
    cursor = None
    try:
        cursor = conn.cursor(dictionary=True)
        cursor.execute(query, params or ())
        
        result = None
        if fetch:
            result = cursor.fetchall()
            result = serialize_result(result)
        
        if commit:
            conn.commit()
            result = cursor.lastrowid
            
        return result
    finally:
        if cursor:
            cursor.close()
        conn.close()

def db_query_one(query, params=None):
    results = db_query(query, params, fetch=True)
    return results[0] if results else None

def db_execute(query, params=None):
    return db_query(query, params, commit=True)
