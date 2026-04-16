from app.main import app

for route in app.routes:
    # Check if it has methods (APIRoute)
    methods = getattr(route, "methods", "N/A")
    print(f"Path: {route.path} | Methods: {methods}")
