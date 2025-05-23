import subprocess
import os
import shutil

def is_url(path_string):
    # A simple check if the path string is a URL.
    # repomix itself has more robust parsing for GitHub shorthand, etc.
    # This is just to help decide on --remote.
    return path_string.startswith("http://") or \
           path_string.startswith("https://") or \
           len(path_string.split('/')) == 2 # Basic check for "user/repo" shorthand

def run_repomix_command(
    input_path: str,
    output_style: str, # 'xml', 'markdown', 'plain'
    output_file_name: str, # e.g., "repomix_output.xml"
    include_patterns: str | None = None,
    ignore_patterns: str | None = None,
    no_file_summary: bool = False,
    no_directory_structure: bool = False,
    show_line_numbers: bool = False,
    parsable_style: bool = False,
    compress_code: bool = False,
    remove_comments: bool = False,
    remove_empty_lines: bool = False,
    # Potentially more options like --copy, --no-gitignore etc. can be added later
) -> tuple[bool, str, str, str]: # (success, stdout, stderr, output_file_path)

    cmd_parts = []
    
    # Determine if npx is available and choose command
    npx_path = shutil.which("npx")
    if npx_path:
        cmd_parts.extend([npx_path, "repomix"])
    else:
        repomix_path = shutil.which("repomix")
        if not repomix_path:
            return False, "", "Repomix command not found. Please ensure npx is available or repomix is installed globally and in PATH.", ""
        cmd_parts.append(repomix_path)

    # Input path (local or remote)
    if is_url(input_path):
        cmd_parts.extend(["--remote", input_path])
    else:
        if not os.path.exists(input_path): # Check only if it's supposed to be a local path
            return False, "", f"Input path not found: {input_path}", ""
        cmd_parts.append(input_path)

    # Output file and style
    output_file_path = os.path.join(os.getcwd(), output_file_name) 
    cmd_parts.extend(["-o", output_file_path])
    cmd_parts.extend(["--style", output_style])

    # Patterns
    if include_patterns:
        cmd_parts.extend(["--include", include_patterns])
    if ignore_patterns:
        cmd_parts.extend(["--ignore", ignore_patterns])

    # Boolean flags
    if no_file_summary:
        cmd_parts.append("--no-file-summary")
    if no_directory_structure:
        cmd_parts.append("--no-directory-structure")
    if show_line_numbers:
        cmd_parts.append("--output-show-line-numbers")
    if parsable_style:
        cmd_parts.append("--parsable-style")
    if compress_code:
        cmd_parts.append("--compress")
    if remove_comments:
        cmd_parts.append("--remove-comments")
    if remove_empty_lines:
        cmd_parts.append("--remove-empty-lines")
        
    cmd_parts.append("--quiet") 

    try:
        use_shell = True if os.name == 'nt' and npx_path and "npx.cmd" in npx_path.lower() else False
        run_cwd = os.getcwd()

        process = subprocess.run(cmd_parts, capture_output=True, text=True, check=False, shell=use_shell, cwd=run_cwd)
        
        if process.returncode == 0:
            if os.path.exists(output_file_path):
                return True, process.stdout, process.stderr, output_file_path
            else:
                # repomix might "succeed" with exit code 0 if, for example, --remote points to a non-existent repo
                # or if no files match include patterns. Stderr often has info in these cases.
                error_detail = f"Repomix command appeared to succeed but output file was not found at {output_file_path}."
                if process.stderr:
                    error_detail += f" STDERR: {process.stderr}"
                if process.stdout: # stdout might also have clues if --quiet wasn't fully effective or for some messages
                    error_detail += f" STDOUT: {process.stdout}"
                return False, process.stdout, error_detail, ""
        else:
            error_message = f"Repomix failed with exit code {process.returncode}.\n"
            error_message += f"Stdout:\n{process.stdout}\n"
            error_message += f"Stderr:\n{process.stderr}"
            return False, process.stdout, error_message, ""
            
    except FileNotFoundError:
        return False, "", "Repomix command execution failed (FileNotFoundError). Ensure npx or repomix is correctly installed and in PATH.", ""
    except Exception as e:
        return False, "", f"An unexpected error occurred while running Repomix: {str(e)}", ""

if __name__ == '__main__':
    # Example usage for testing - this won't run when imported
    if not os.path.exists("dummy_test_dir"):
        os.makedirs("dummy_test_dir")
    with open(os.path.join("dummy_test_dir", "test_file.txt"), "w") as f:
        f.write("Hello world from test file.")

    print("Testing with local path:")
    success, stdout, stderr, out_file = run_repomix_command(
        input_path="dummy_test_dir", 
        output_style="xml", 
        output_file_name="local_test_output.xml",
        compress_code=True
    )
    if success:
        print(f"Local pack successful! Output: {out_file}")
        if os.path.exists(out_file): print(f"File content snippet: {open(out_file).read(150)}...")
    else:
        print(f"Local pack failed.")
        print(f"Error Message / STDERR:\n{stderr}")

    print("\nTesting with remote path (small, known repo):")
    # Using a known small public repo for testing; replace if problematic.
    # nodejs/help was giving issues, trying another small repo.
    # Example: "https://github.com/octocat/Spoon-Knife"
    success_remote, stdout_remote, stderr_remote, out_file_remote = run_repomix_command(
        input_path="https://github.com/octocat/Spoon-Knife", 
        output_style="markdown",
        output_file_name="remote_test_output.md",
        no_file_summary=True
    )
    if success_remote:
        print(f"Remote pack successful! Output: {out_file_remote}")
        if os.path.exists(out_file_remote): print(f"File content snippet: {open(out_file_remote).read(150)}...")
    else:
        print(f"Remote pack failed.")
        print(f"Error Message / STDERR:\n{stderr_remote}")
    
    # Clean up
    if os.path.exists("dummy_test_dir"):
        shutil.rmtree("dummy_test_dir")
    if os.path.exists("local_test_output.xml"):
        os.remove("local_test_output.xml")
    if os.path.exists("remote_test_output.md"):
        os.remove("remote_test_output.md")
