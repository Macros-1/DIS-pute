import random
import time
import sys

def heavy_sort():
    # 1. Generate 1000 random numbers
    print("🎲 Generating 1,000 random data points...")
    data = [random.randint(1, 10000) for _ in range(1000)]
    n = len(data)
    
    print(f"🚀 Starting Bubble Sort on {n} entries...")
    start_time = time.time()

    # 2. Bubble Sort (O(n^2) - intentionally slow for testing)
    for i in range(n):
        for j in range(0, n - i - 1):
            if data[j] > data[j + 1]:
                data[j], data[j + 1] = data[j + 1], data[j]
        
        # Every 100 iterations, print progress to see it in your Dashboard Logs
        if i % 100 == 0 and i > 0:
            elapsed = time.time() - start_time
            print(f"⏳ Progress: {i}/1000 rows sorted... (Time: {elapsed:.2f}s)")
            # Small sleep to prevent the log buffer from overfilling too fast
            time.sleep(0.1) 

    end_time = time.time()
    print("━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"✅ SUCCESS: 1,000 entries sorted in {end_time - start_time:.2f} seconds.")
    print(f"📊 Preview of sorted data: {data[:10]}...")

if __name__ == "__main__":
    # The -u flag in the command (or forcing flush) ensures logs appear instantly
    heavy_sort()
    sys.stdout.flush()