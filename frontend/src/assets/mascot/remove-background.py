#!/usr/bin/env python3
"""
Script para remover fundo branco das imagens da Zeni
Converte fundo branco para transparente
"""

from PIL import Image
import os

def remove_white_background(input_path, output_path, threshold=240):
    """
    Remove fundo branco de uma imagem PNG

    Args:
        input_path: Caminho da imagem de entrada
        output_path: Caminho da imagem de saída
        threshold: Limite para considerar pixel como branco (0-255)
    """
    # Abrir imagem
    img = Image.open(input_path)

    # Converter para RGBA se necessário
    img = img.convert("RGBA")

    # Obter dados dos pixels
    datas = img.getdata()

    newData = []
    for item in datas:
        # Trocar todos pixels brancos (ou próximos) por transparente
        # item[0] = R, item[1] = G, item[2] = B, item[3] = A
        if item[0] > threshold and item[1] > threshold and item[2] > threshold:
            # Pixel branco - tornar transparente
            newData.append((255, 255, 255, 0))
        else:
            # Manter pixel original
            newData.append(item)

    # Atualizar dados da imagem
    img.putdata(newData)

    # Salvar com transparência
    img.save(output_path, "PNG")
    print(f"✅ Processado: {os.path.basename(output_path)}")

def main():
    # Diretório atual (onde está o script)
    current_dir = os.path.dirname(os.path.abspath(__file__))

    # Lista de arquivos PNG para processar
    png_files = [
        'zeni-mascot.png',
        'zeni-happy.png',
        'zeni-thinking.png',
        'zeni-worried.png',
        'zeni-waving.png',
        'zeni-icon.png'
    ]

    print("🎨 Removendo fundo branco das imagens da Zeni...\n")

    processed = 0
    for filename in png_files:
        input_path = os.path.join(current_dir, filename)

        if not os.path.exists(input_path):
            print(f"⚠️  Arquivo não encontrado: {filename}")
            continue

        # Output com sufixo -transparent ou substituir original
        # Descomentar a linha que preferir:

        # Opção 1: Criar novo arquivo com sufixo
        # output_path = input_path.replace('.png', '-transparent.png')

        # Opção 2: Substituir arquivo original (recomendado)
        output_path = input_path

        try:
            remove_white_background(input_path, output_path, threshold=240)
            processed += 1
        except Exception as e:
            print(f"❌ Erro ao processar {filename}: {str(e)}")

    print(f"\n🎉 Concluído! {processed}/{len(png_files)} imagens processadas.")
    print("\n💡 Dica: Se algumas imagens ainda tiverem fundo, ajuste o 'threshold' no script.")

if __name__ == "__main__":
    main()
