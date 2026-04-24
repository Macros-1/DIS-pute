import bpy
import time

# --- GPU Configuration ---
def enable_gpu():
    preferences = bpy.context.preferences
    cycles_preferences = preferences.addons['cycles'].preferences
    
    # Enable CUDA (for NVIDIA)
    cycles_preferences.compute_device_type = 'CUDA' 
    cycles_preferences.get_devices()
    
    for device in cycles_preferences.devices:
        if device.type == 'CUDA':
            device.use = True
            print(f"✅ Using GPU: {device.name}")

# --- Render Settings ---
bpy.context.scene.render.engine = 'CYCLES'
bpy.context.scene.cycles.device = 'GPU'
enable_gpu()

start_time = time.time()

# Perform a dummy render or a sample render
print("🚀 Starting Blender GPU Render...")
bpy.ops.render.render(write_still=True)

end_time = time.time()
duration = round(end_time - start_time, 2)

# --- Performance Rating Logic ---
# Lower duration = higher score
score = int(10000 / duration) if duration > 0 else 0

print(f"\n--- GPU PERFORMANCE REPORT ---")
print(f"Render Time: {duration}s")
print(f"Final Performance Score: {score}")
print(f"Rating: {'S-Tier' if score > 500 else 'A-Tier' if score > 300 else 'B-Tier'}")