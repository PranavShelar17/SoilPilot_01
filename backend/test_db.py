import sys
from sqlalchemy import create_engine, text

DATABASE_URL = 'postgresql://soilpilot_user:soilpilot_password@127.0.0.1:5432/soilpilot_db'

try:
    engine = create_engine(DATABASE_URL)
    with engine.connect() as conn:
        res = conn.execute(text('SELECT * FROM talukas;')).fetchall()
        print('Talukas:', res)
        res_v = conn.execute(text('SELECT count(*) FROM villages;')).scalar()
        print('Villages count:', res_v)
        res_b = conn.execute(text('SELECT count(*) FROM villages WHERE taluka_id IN (SELECT id FROM talukas WHERE name LIKE \'%Baramati%\');')).scalar()
        print('Villages in Baramati:', res_b)
        
        villages = conn.execute(text('SELECT name FROM villages WHERE taluka_id = (SELECT id FROM talukas WHERE name = \'Baramati\');')).fetchall()
        print('Baramati villages:', villages[:5])
except Exception as e:
    print('Error:', e)
