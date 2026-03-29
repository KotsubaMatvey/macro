from app.demo_state import save_state, seed_state

if __name__ == "__main__":
    save_state(seed_state())
    print("demo data seeded")
