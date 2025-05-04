# Geração de Favicons

Este diretório contém os arquivos necessários para gerar os favicons do sistema de Triagem Médica.

## Requisitos

- Python 3.8 ou superior
- pip (gerenciador de pacotes Python)

## Instalação

1. Instale a dependência necessária:
```bash
python -m pip install Pillow
```

## Gerando os Favicons

1. Execute o script Python:
```bash
python generate_favicons.py
```

O script irá gerar:
- favicon.ico (16x16 e 32x32) - para navegadores antigos
- favicon-16x16.png - para navegadores modernos
- favicon-32x32.png - para navegadores modernos
- apple-touch-icon.png (180x180) - para dispositivos iOS
- android-chrome-192x192.png - para dispositivos Android
- android-chrome-512x512.png - para dispositivos Android

Os arquivos serão gerados no diretório atual e o favicon.ico será colocado no diretório pai (public/).

## Personalização

O script gera um ícone médico (cruz) em um fundo azul (#2196F3). Para modificar o design do ícone:

1. Abra o arquivo `generate_favicons.py`
2. Você pode ajustar:
   - `background_color`: Cor de fundo do ícone (atualmente "#2196F3")
   - `icon_color`: Cor do símbolo da cruz (atualmente "#FFFFFF")
   - `padding`: Espaçamento entre a borda e o círculo
   - `cross_thickness`: Espessura da cruz
   - `cross_padding`: Tamanho da cruz em relação ao círculo

3. Execute o script novamente após fazer as modificações 