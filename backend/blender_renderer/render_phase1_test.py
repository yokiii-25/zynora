from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIRECTORY = PROJECT_ROOT / "outputs" / "blender"
OUTPUT_DIRECTORY.mkdir(parents=True, exist_ok=True)

IMAGE_PATH = OUTPUT_DIRECTORY / "phase1-test.png"
BLEND_PATH = OUTPUT_DIRECTORY / "phase1-test.blend"


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)


def make_material(
    name: str,
    color: tuple[float, float, float],
    *,
    metallic: float = 0.0,
    roughness: float = 0.5,
) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*color, 1.0)

    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1.0)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return material


def add_box(
    name: str,
    size: tuple[float, float, float],
    location: tuple[float, float, float],
    material: bpy.types.Material,
    *,
    bevel: float = 0.025,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = tuple(value / 2.0 for value in size)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)

    if bevel > 0:
        modifier = obj.modifiers.new(name="Edge bevel", type="BEVEL")
        modifier.width = bevel
        modifier.segments = 2

    return obj


def add_window(
    name: str,
    x: float,
    z: float,
    width: float,
    height: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> None:
    add_box(
        f"{name}-frame",
        (width + 0.18, 0.16, height + 0.18),
        (x, -3.10, z),
        frame,
        bevel=0.015,
    )
    add_box(
        f"{name}-glass",
        (width, 0.18, height),
        (x, -3.20, z),
        glass,
        bevel=0.01,
    )
    add_box(
        f"{name}-mullion",
        (0.055, 0.20, height),
        (x, -3.31, z),
        frame,
        bevel=0.005,
    )


def add_railing(
    x_start: float,
    x_end: float,
    y: float,
    z: float,
    frame: bpy.types.Material,
    glass: bpy.types.Material,
) -> None:
    add_box(
        "balcony-glass",
        (x_end - x_start, 0.06, 0.82),
        ((x_start + x_end) / 2.0, y, z + 0.42),
        glass,
        bevel=0.005,
    )
    add_box(
        "balcony-top-rail",
        (x_end - x_start + 0.12, 0.08, 0.08),
        ((x_start + x_end) / 2.0, y, z + 0.87),
        frame,
        bevel=0.01,
    )

    post_count = 6
    for index in range(post_count):
        factor = index / (post_count - 1)
        x = x_start + ((x_end - x_start) * factor)
        add_box(
            f"balcony-post-{index}",
            (0.07, 0.08, 0.92),
            (x, y, z + 0.46),
            frame,
            bevel=0.008,
        )


def add_shrub(name: str, location: tuple[float, float, float]) -> None:
    bpy.ops.mesh.primitive_ico_sphere_add(
        subdivisions=3,
        radius=0.42,
        location=location,
    )
    shrub = bpy.context.object
    shrub.name = name
    shrub.scale.z = 0.82
    shrub.data.materials.append(MATERIALS["leaf"])


def point_camera(camera: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - camera.location
    camera.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


clear_scene()

MATERIALS = {
    "cream": make_material("Cream plaster", (0.82, 0.79, 0.69), roughness=0.72),
    "white": make_material("Warm white plaster", (0.93, 0.92, 0.88), roughness=0.68),
    "wood": make_material("Warm wood", (0.38, 0.14, 0.045), roughness=0.42),
    "charcoal": make_material("Charcoal metal", (0.025, 0.032, 0.035), metallic=0.72, roughness=0.25),
    "glass": make_material("Blue glass", (0.08, 0.27, 0.34), metallic=0.22, roughness=0.12),
    "paving": make_material("Paving", (0.23, 0.25, 0.24), roughness=0.82),
    "road": make_material("Road", (0.055, 0.065, 0.075), roughness=0.94),
    "grass": make_material("Grass", (0.045, 0.22, 0.055), roughness=0.95),
    "leaf": make_material("Shrub leaves", (0.025, 0.18, 0.045), roughness=0.9),
}

# Site and road.
add_box("site", (30.0, 23.0, 0.18), (0.0, 0.0, -0.10), MATERIALS["grass"], bevel=0)
add_box("road", (30.0, 5.0, 0.12), (0.0, -9.0, 0.0), MATERIALS["road"], bevel=0)
add_box("front-paving", (13.0, 7.0, 0.13), (0.0, -3.0, 0.0), MATERIALS["paving"], bevel=0)

# Main two-storey building massing.
add_box("ground-floor", (9.2, 6.0, 3.2), (0.0, 0.0, 1.65), MATERIALS["cream"])
add_box("upper-floor", (9.2, 6.0, 3.0), (0.35, 0.10, 4.72), MATERIALS["white"])
add_box("roof-slab", (9.8, 6.6, 0.24), (0.35, 0.10, 6.35), MATERIALS["charcoal"])
add_box("mid-band", (9.55, 6.28, 0.28), (0.17, 0.05, 3.27), MATERIALS["charcoal"])

# Door, windows and façade composition.
add_box("main-door-frame", (1.38, 0.20, 2.60), (-1.15, -3.12, 1.33), MATERIALS["charcoal"])
add_box("main-door", (1.15, 0.24, 2.38), (-1.15, -3.25, 1.25), MATERIALS["wood"])

add_window("ground-left", -3.15, 1.62, 1.75, 1.22, MATERIALS["charcoal"], MATERIALS["glass"])
add_window("ground-right", 2.20, 1.62, 2.05, 1.30, MATERIALS["charcoal"], MATERIALS["glass"])
add_window("upper-left", -3.10, 4.75, 1.85, 1.30, MATERIALS["charcoal"], MATERIALS["glass"])
add_window("upper-centre", 0.15, 4.75, 1.55, 1.35, MATERIALS["charcoal"], MATERIALS["glass"])
add_window("upper-right", 3.05, 4.75, 1.85, 1.30, MATERIALS["charcoal"], MATERIALS["glass"])

# Balcony and modern wood fins.
add_box("balcony-slab", (6.35, 1.65, 0.18), (-1.15, -3.73, 3.35), MATERIALS["white"])
add_railing(-4.10, 1.80, -4.46, 3.45, MATERIALS["charcoal"], MATERIALS["glass"])

for index in range(7):
    add_box(
        f"wood-fin-{index}",
        (0.12, 0.24, 3.30),
        (1.80 + index * 0.18, -3.22, 4.63),
        MATERIALS["wood"],
        bevel=0.012,
    )

# Tall façade frame and entrance canopy.
add_box("facade-frame-left", (0.30, 0.26, 6.15), (-4.50, -3.20, 3.16), MATERIALS["wood"])
add_box("facade-frame-top", (9.35, 0.26, 0.30), (0.02, -3.20, 6.10), MATERIALS["wood"])
add_box("entrance-canopy", (3.55, 1.20, 0.18), (-1.15, -3.75, 2.82), MATERIALS["charcoal"])

# Entrance steps and landscaping.
for index in range(3):
    add_box(
        f"step-{index}",
        (3.2 - index * 0.34, 0.72, 0.14),
        (-1.15, -4.10 - index * 0.42, 0.07 + index * 0.14),
        MATERIALS["white"],
        bevel=0.015,
    )

add_shrub("left-shrub", (-4.45, -4.10, 0.40))
add_shrub("right-shrub", (3.85, -3.85, 0.40))

# Camera.
bpy.ops.object.camera_add(location=(12.8, -16.5, 9.2))
camera = bpy.context.object
camera.name = "front-right-camera"
camera.data.lens = 48
camera.data.sensor_width = 36
point_camera(camera, (0.0, 0.0, 3.05))
bpy.context.scene.camera = camera

# Daylight.
bpy.ops.object.light_add(type="SUN", location=(4.0, -6.0, 12.0))
sun = bpy.context.object
sun.name = "architectural-sun"
sun.data.energy = 2.3
sun.data.angle = math.radians(7.0)
sun.rotation_euler = (
    math.radians(28.0),
    math.radians(-18.0),
    math.radians(-32.0),
)

bpy.ops.object.light_add(type="AREA", location=(-5.0, -8.0, 10.0))
fill = bpy.context.object
fill.name = "soft-fill"
fill.data.energy = 850.0
fill.data.shape = "DISK"
fill.data.size = 7.0
point_camera(fill, (0.0, 0.0, 2.8))

world = bpy.context.scene.world
world.use_nodes = True
nodes = world.node_tree.nodes
links = world.node_tree.links
nodes.clear()

world_output = nodes.new(type="ShaderNodeOutputWorld")
background = nodes.new(type="ShaderNodeBackground")
sky = nodes.new(type="ShaderNodeTexSky")
sky.sky_type = "NISHITA"
sky.sun_elevation = math.radians(32.0)
sky.sun_rotation = math.radians(120.0)
sky.altitude = 0.18
background.inputs["Strength"].default_value = 0.32
links.new(sky.outputs["Color"], background.inputs["Color"])
links.new(background.outputs["Background"], world_output.inputs["Surface"])

# Fast deterministic first milestone. Cycles/OptiX comes after this passes.
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = 1280
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.image_settings.color_mode = "RGB"
scene.render.film_transparent = False
scene.render.filepath = str(IMAGE_PATH)

scene.render.image_settings.color_depth = "8"
scene.render.image_settings.compression = 25

bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
bpy.ops.render.render(write_still=True)

print(f"ZYNORA_TEST_RENDER={IMAGE_PATH}")
print(f"ZYNORA_TEST_SCENE={BLEND_PATH}")
