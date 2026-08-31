import os
import zipfile

def create_project_zip(source_dir, output_zip_path):
    print(f"Creating zip from {source_dir} to {output_zip_path}...")
    
    exclude_dirs = {'node_modules', '__pycache__', '.git', '.venv', 'dist'}
    exclude_files = {'.DS_Store', 'identity-screening-app-completed.zip'}
    
    file_count = 0
    with zipfile.ZipFile(output_zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            # Prune excluded directories
            dirs[:] = [d for d in dirs if d not in exclude_dirs]
            
            for file in files:
                if file in exclude_files or file.endswith('.pyc') or file.endswith('.zip'):
                    continue
                
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, os.path.dirname(source_dir))
                zipf.write(full_path, rel_path)
                file_count += 1

    size_mb = os.path.getsize(output_zip_path) / (1024 * 1024)
    print(f"Zip created successfully: {output_zip_path} ({size_mb:.2f} MB, {file_count} files)")

if __name__ == '__main__':
    src = r"d:\2nd Year\SIH\identity-screening-app\identity-screening-app"
    out1 = r"d:\2nd Year\SIH\identity-screening-app\identity-screening-app-completed.zip"
    out2 = r"d:\2nd Year\SIH\identity-screening-app\identity-screening-app\identity-screening-app-completed.zip"
    
    create_project_zip(src, out1)
    create_project_zip(src, out2)
