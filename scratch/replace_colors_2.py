import os
import re

dir_path = r'c:\pinboard\src'

exact_replacements = {
    'bg-gray-900': 'bg-[var(--bg-primary)]',
    'bg-gray-800': 'bg-[var(--bg-card)]',
    'bg-gray-750': 'bg-[var(--bg-card-hover)]',
    'bg-gray-700': 'bg-[var(--bg-card-hover)]',
    'border-gray-700': 'border-[var(--border)]',
    'border-gray-600': 'border-[var(--border)]',
    'text-gray-300': 'text-[var(--text-secondary)]',
    'text-gray-400': 'text-[var(--text-secondary)]',
    'text-gray-500': 'text-[var(--text-muted)]',
    'hover:bg-gray-800': 'hover:bg-[var(--bg-card-hover)]',
    'hover:bg-gray-750': 'hover:bg-[var(--bg-card-hover)]',
    'hover:bg-gray-700': 'hover:bg-[var(--bg-card-hover)]',
    'hover:bg-gray-600': 'hover:bg-[var(--bg-card-hover)]',
    'hover:border-gray-700': 'hover:border-[var(--text-secondary)]',
    'hover:text-gray-300': 'hover:text-[var(--text-primary)]',
    'hover:text-gray-400': 'hover:text-[var(--text-primary)]',
    'text-indigo-300': 'text-[var(--accent-purple)]',
    'bg-[#1e1e28]': 'bg-[var(--bg-card)]',
}

for root, _, files in os.walk(dir_path):
    for file in files:
        if file.endswith('.jsx') or file.endswith('.js'):
            file_path = os.path.join(root, file)
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            new_content = content
            for old, new in exact_replacements.items():
                new_content = new_content.replace(old, new)
            
            if new_content != content:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                print(f"Updated {file}")
print("Done")
