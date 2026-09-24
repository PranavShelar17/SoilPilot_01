import sys
import os

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from app.db.session import SessionLocal
from app.models.geography import State, District, Taluka, Village

def seed_geography_data():
    db = SessionLocal()
    try:
        print("Starting seed process...")
        # 1. State
        state = db.query(State).filter_by(name="Maharashtra").first()
        if not state:
            state = State(name="Maharashtra", code="MH")
            db.add(state)
            db.commit()
            db.refresh(state)
            print("Added State: Maharashtra")

        # 2. District
        district = db.query(District).filter_by(name="Pune", state_id=state.id).first()
        if not district:
            district = District(name="Pune", state_id=state.id, code="PN")
            db.add(district)
            db.commit()
            db.refresh(district)
            print("Added District: Pune")

        # 3. Talukas
        pune_talukas = [
            "Haveli", "Pune City", "Maval", "Mulshi", "Shirur", 
            "Baramati", "Daund", "Indapur", "Bhor", "Velha", 
            "Purandar", "Khed", "Junnar", "Ambegaon", "Pimpri-Chinchwad", "Loni Kalbhor"
        ]

        taluka_objs = {}
        for t_name in pune_talukas:
            t = db.query(Taluka).filter_by(name=t_name, district_id=district.id).first()
            if not t:
                t = Taluka(name=t_name, district_id=district.id)
                db.add(t)
            taluka_objs[t_name] = t
        db.commit()
        print(f"Added {len(pune_talukas)} Talukas")

        # 4. Villages for Baramati
        baramati = taluka_objs.get("Baramati")
        if not baramati:
            baramati = db.query(Taluka).filter_by(name="Baramati").first()

        if baramati:
            baramati_villages = ["Malegaon", "Wagholi", "Songaon", "Dorlewadi", "Mekhali"]
            for v_name in baramati_villages:
                v = db.query(Village).filter_by(name=v_name, taluka_id=baramati.id).first()
                if not v:
                    v = Village(name=v_name, taluka_id=baramati.id)
                    db.add(v)
            db.commit()
            print(f"Added {len(baramati_villages)} Villages for Baramati")
            
        print("Seeding completed successfully!")
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_geography_data()
