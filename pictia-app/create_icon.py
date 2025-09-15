#!/usr/bin/env python3
"""
Create Pictia app icon
Requires: pip install Pillow
"""

from PIL import Image, ImageDraw, ImageFont
import math

def create_icon(size=1024):
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Background gradient effect (simplified as solid color for now)
    # Create rounded rectangle background
    corner_radius = size // 6  # iOS style corner radius
    
    # Background color - modern purple gradient
    bg_color = (102, 126, 234)  # #667eea
    
    # Draw rounded rectangle background
    draw.rounded_rectangle(
        [(0, 0), (size, size)], 
        radius=corner_radius, 
        fill=bg_color
    )
    
    # Center point
    center_x, center_y = size // 2, size // 2
    
    # Draw photo cards (stack effect)
    card_width = size // 3.2
    card_height = size // 4.3
    
    # Back card (rotated)
    back_card_points = [
        (center_x - card_width//2 + 20, center_y - card_height//2 + 10),
        (center_x + card_width//2 + 30, center_y - card_height//2 - 5),
        (center_x + card_width//2 + 10, center_y + card_height//2 + 15),
        (center_x - card_width//2, center_y + card_height//2 + 30)
    ]
    draw.polygon(back_card_points, fill=(255, 255, 255, 80))
    
    # Front card (main)
    card_left = center_x - card_width // 2
    card_top = center_y - card_height // 2
    card_right = center_x + card_width // 2
    card_bottom = center_y + card_height // 2
    
    draw.rounded_rectangle(
        [(card_left, card_top), (card_right, card_bottom)],
        radius=size//40,
        fill=(255, 255, 255, 240),
        outline=(255, 255, 255, 255),
        width=2
    )
    
    # Draw simple mountain scene in the card
    mountain_y = center_y + card_height // 6
    mountain_points = [
        (card_left + 20, mountain_y),
        (center_x - 30, center_y - 20),
        (center_x, center_y - 10),
        (center_x + 30, center_y - 30),
        (card_right - 20, mountain_y)
    ]
    draw.polygon(mountain_points, fill=(102, 126, 234, 180))
    
    # Draw sun
    sun_x = center_x + card_width // 4
    sun_y = center_y - card_height // 4
    sun_radius = size // 50
    draw.ellipse(
        [(sun_x - sun_radius, sun_y - sun_radius), 
         (sun_x + sun_radius, sun_y + sun_radius)],
        fill=(255, 215, 0, 200)
    )
    
    # Draw swipe indicators
    indicator_radius = size // 25
    indicator_y = center_y + card_height // 2 + size // 12
    
    # Left indicator (delete - X)
    left_x = center_x - card_width // 2 - size // 15
    draw.ellipse(
        [(left_x - indicator_radius, indicator_y - indicator_radius),
         (left_x + indicator_radius, indicator_y + indicator_radius)],
        fill=(255, 71, 87, 150)
    )
    # X mark
    x_size = indicator_radius // 2
    draw.line([(left_x - x_size, indicator_y - x_size), 
               (left_x + x_size, indicator_y + x_size)], 
              fill=(255, 255, 255), width=3)
    draw.line([(left_x + x_size, indicator_y - x_size), 
               (left_x - x_size, indicator_y + x_size)], 
              fill=(255, 255, 255), width=3)
    
    # Right indicator (keep - checkmark)
    right_x = center_x + card_width // 2 + size // 15
    draw.ellipse(
        [(right_x - indicator_radius, indicator_y - indicator_radius),
         (right_x + indicator_radius, indicator_y + indicator_radius)],
        fill=(46, 213, 115, 150)
    )
    # Checkmark
    check_size = indicator_radius // 2
    draw.line([(right_x - check_size, indicator_y), 
               (right_x - check_size//3, indicator_y + check_size//2)], 
              fill=(255, 255, 255), width=3)
    draw.line([(right_x - check_size//3, indicator_y + check_size//2), 
               (right_x + check_size, indicator_y - check_size//2)], 
              fill=(255, 255, 255), width=3)
    
    # Draw "P" letter at bottom
    try:
        # Try to use a system font
        font_size = size // 8
        font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
    except:
        # Fallback to default font
        font = ImageFont.load_default()
    
    letter_y = center_y + card_height // 2 + size // 6
    
    # Get text bounding box for centering
    bbox = draw.textbbox((0, 0), "P", font=font)
    text_width = bbox[2] - bbox[0]
    text_height = bbox[3] - bbox[1]
    
    draw.text(
        (center_x - text_width // 2, letter_y - text_height // 2),
        "P",
        fill=(255, 255, 255, 230),
        font=font
    )
    
    return img

if __name__ == "__main__":
    # Create main icon (1024x1024)
    icon = create_icon(1024)
    icon.save("assets/icon.png", "PNG")
    print("Created icon.png (1024x1024)")
    
    # Create adaptive icon for Android (512x512 recommended)
    adaptive_icon = create_icon(512)
    adaptive_icon.save("assets/adaptive-icon.png", "PNG")
    print("Created adaptive-icon.png (512x512)")
    
    # Create favicon (256x256)
    favicon = create_icon(256)
    favicon.save("assets/favicon.png", "PNG")
    print("Created favicon.png (256x256)")
    
    # Create splash icon (400x400)
    splash = create_icon(400)
    splash.save("assets/splash-icon.png", "PNG")
    print("Created splash-icon.png (400x400)")
    
    print("All icons created successfully!")