from PIL import Image, ImageDraw

# Tamanhos necessários para os favicons
sizes = [
    (16, 16),
    (32, 32),
    (180, 180),  # Apple Touch Icon
    (192, 192),  # Android Chrome
    (512, 512)   # Android Chrome Large
]

# Criar uma imagem base
size = (512, 512)
background_color = "#2196F3"  # Azul principal
icon_color = "#FFFFFF"  # Branco

# Criar a imagem base
base_image = Image.new('RGB', size, background_color)
draw = ImageDraw.Draw(base_image)

# Desenhar um círculo preenchido
padding = 50
circle_bbox = (padding, padding, size[0]-padding, size[1]-padding)
draw.ellipse(circle_bbox, fill=background_color, outline=icon_color, width=20)

# Desenhar a cruz
cross_padding = size[0] // 4
cross_thickness = 40
# Linha vertical
draw.rectangle((size[0]//2 - cross_thickness//2, cross_padding, 
                size[0]//2 + cross_thickness//2, size[1]-cross_padding), 
                fill=icon_color)
# Linha horizontal
draw.rectangle((cross_padding, size[1]//2 - cross_thickness//2,
                size[0]-cross_padding, size[1]//2 + cross_thickness//2),
                fill=icon_color)

# Gerar os diferentes tamanhos
for size in sizes:
    resized = base_image.resize(size, Image.Resampling.LANCZOS)
    
    # Definir o nome do arquivo baseado no tamanho
    if size == (16, 16):
        filename = 'favicon-16x16.png'
    elif size == (32, 32):
        filename = 'favicon-32x32.png'
    elif size == (180, 180):
        filename = 'apple-touch-icon.png'
    elif size == (192, 192):
        filename = 'android-chrome-192x192.png'
    else:
        filename = 'android-chrome-512x512.png'
    
    resized.save(filename, 'PNG')

# Gerar o favicon.ico (16x16 e 32x32 combinados)
img_16 = base_image.resize((16, 16), Image.Resampling.LANCZOS)
img_32 = base_image.resize((32, 32), Image.Resampling.LANCZOS)
img_32.save('../favicon.ico', format='ICO', sizes=[(16,16), (32,32)]) 