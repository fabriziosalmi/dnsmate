#!/usr/bin/env python3
"""Apply multi_server_mode migration manually"""

import sqlite3
import sys
import os

# Database path
db_path = os.path.join(os.path.dirname(__file__), 'test.db')

def apply_migration():
    """Apply the multi_server_mode migration"""
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column exists
        cursor.execute("PRAGMA table_info(powerdns_settings)")
        columns = [row[1] for row in cursor.fetchall()]
        
        if 'multi_server_mode' not in columns:
            print("Adding multi_server_mode column...")
            
            # Add the column
            cursor.execute("ALTER TABLE powerdns_settings ADD COLUMN multi_server_mode BOOLEAN DEFAULT 0")
            
            # Set default value for existing records
            cursor.execute("UPDATE powerdns_settings SET multi_server_mode = 0 WHERE multi_server_mode IS NULL")
            
            conn.commit()
            print("Migration applied successfully!")
        else:
            print("Column multi_server_mode already exists")
        
        conn.close()
        return True
        
    except Exception as e:
        print(f"Error applying migration: {e}")
        return False

if __name__ == "__main__":
    success = apply_migration()
    sys.exit(0 if success else 1)
