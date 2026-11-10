# Blender demo: a spiral tower shell grown from one sphere, standing on a name plate.
# How to run: open Blender, click the Scripting tab, New, paste this file, press the Run button (play icon).
# Then File > Export > STL, tick "Selection Only", and save. Written for Blender 3.6 to 4.x; not yet run on the lab computer.
import bpy, math

NAME = "ST. CROIX"     # text on the plate
TURNS = 4.0            # how many times the shell winds
SIZE = 48.0            # height of the shell in mm

# start clean
bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete()

# Blender works in metres by default; set the scene to millimetres so the STL comes out the right size
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"
scene.unit_settings.scale_length = 0.001
scene.unit_settings.length_unit = "MILLIMETERS"

# 1. The shell: one sphere copied along a growing, sinking spiral,
#    so every step is visible in the code.
steps = int(TURNS * 30)
parts = []
for i in range(steps):
    t = i / steps
    r_ring = 1.2 + 4.0 * t           # tube gets fatter as it winds down
    r_path = 2.5 + 13.0 * t          # spiral gets wider
    ang = 2 * math.pi * TURNS * t
    z = r_ring - 0.5 + (SIZE - 10) * (1 - t) ** 1.3   # starts at the tip, winds down to the plate
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=10, radius=r_ring,
                                         location=(r_path * math.cos(ang), r_path * math.sin(ang), z))
    parts.append(bpy.context.active_object)

# a cone up the middle fills the inside so the shell prints as one solid
bpy.ops.mesh.primitive_cone_add(vertices=48, radius1=9, radius2=1.5, depth=SIZE - 6,
                                location=(0, 0, (SIZE - 6) / 2))
parts.append(bpy.context.active_object)

# join every sphere into one object, then fuse them into one clean solid with a Remesh
for o in parts:
    o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
shell = bpy.context.active_object
shell.name = "Shell"
rm = shell.modifiers.new("Fuse", "REMESH")
rm.mode = "VOXEL"
rm.voxel_size = 0.6
sm = shell.modifiers.new("Smooth", "SMOOTH")
sm.iterations = 6
bpy.ops.object.modifier_apply(modifier="Fuse")
bpy.ops.object.modifier_apply(modifier="Smooth")

# 2. A plate with raised text, so it stands up and says where it is from
bpy.ops.mesh.primitive_cylinder_add(vertices=64, radius=30, depth=3, location=(0, 0, -1.5))
plate = bpy.context.active_object
plate.name = "Plate"

bpy.ops.object.text_add(location=(0, -25.5, 0))
label = bpy.context.active_object
label.data.body = NAME
label.data.align_x = "CENTER"
label.data.size = 4
label.data.extrude = 0.6
bpy.ops.object.convert(target="MESH")
label.location.z = 0.6

# select everything that belongs to the print so "Selection Only" export takes it all
bpy.ops.object.select_all(action="DESELECT")
for o in (shell, plate, label):
    o.select_set(True)
bpy.context.view_layer.objects.active = shell
print("Done. File > Export > STL, tick Selection Only.")
