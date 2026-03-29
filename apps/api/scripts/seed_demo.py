from pathlib import Path 
import sys 
 
sys.path.insert(0, str(Path(__file__).resolve().parents[1])) 
 
from app.seed import seed_demo_database 
 
if __name__ == '__main__': 
    seed_demo_database() 
