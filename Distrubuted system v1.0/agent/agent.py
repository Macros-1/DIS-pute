import requests
import time

MASTER_URL = "http://master:8000"

while True:
    try:
        r = requests.get(MASTER_URL)
        print("Connected to master:", r.json())
    except:
        print("Master not reachable")

    time.sleep(5)