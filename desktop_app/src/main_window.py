import sys

from PySide6.QtCore import Qt
from PySide6.QtGui import QPalette, QColor, QFont
from PySide6.QtWidgets import (
    QApplication,
    QMainWindow,
    QVBoxLayout,
    QWidget,
    QHBoxLayout,
    QPushButton,
    QLineEdit,
    QGroupBox,
    QSizePolicy,
    QLabel,
    QRadioButton,
    QButtonGroup,
    QCheckBox,
)


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.setWindowTitle("RepoPacker")
        self.setGeometry(100, 100, 850, 650) # Slightly increased window size

        self.apply_dark_theme()
        QApplication.setFont(QFont("Segoe UI", 9)) # Example font

        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        # Top Section
        top_section_group_box = QGroupBox("Repository Input")
        top_section_layout = QHBoxLayout(top_section_group_box)

        self.github_button = QPushButton("GitHub")
        self.github_button.setFixedWidth(80)
        top_section_layout.addWidget(self.github_button)

        self.folder_button = QPushButton("Folder")
        self.folder_button.setFixedWidth(80)
        top_section_layout.addWidget(self.folder_button)

        self.copy_button = QPushButton("Copy")
        self.copy_button.setFixedWidth(80)
        top_section_layout.addWidget(self.copy_button)

        self.path_input_field = QLineEdit()
        self.path_input_field.setPlaceholderText("Enter GitHub URL or local path")
        self.path_input_field.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        top_section_layout.addWidget(self.path_input_field)

        self.pack_button = QPushButton("Pack")
        self.pack_button.setFixedWidth(120)
        # You can apply a specific style to pack_button later if needed
        # For now, making it prominent might involve a slightly different color
        # or ensuring it stands out. The dark theme already helps.
        top_section_layout.addWidget(self.pack_button)
        self.pack_button.setObjectName("PackButton") # Set object name for specific styling
        self.pack_button.clicked.connect(self.on_pack_button_clicked)
        
        top_section_group_box.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Maximum)
        main_layout.addWidget(top_section_group_box)

        # Center Horizontal Layout for Middle and Right Panels
        center_horizontal_layout = QHBoxLayout()

        # Middle Section
        middle_section_group_box = QGroupBox("Output Configuration")
        middle_section_group_box.setMinimumWidth(350) # Adjusted minimum width
        # middle_section_group_box.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        middle_section_layout = QVBoxLayout(middle_section_group_box)

        # Output Format Toggles
        format_toggle_layout = QHBoxLayout()
        self.xml_radio_button = QRadioButton("XML")
        self.markdown_radio_button = QRadioButton("Markdown")
        self.plain_radio_button = QRadioButton("Plain")
        self.xml_radio_button.setChecked(True)

        self.output_format_button_group = QButtonGroup()
        self.output_format_button_group.addButton(self.xml_radio_button)
        self.output_format_button_group.addButton(self.markdown_radio_button)
        self.output_format_button_group.addButton(self.plain_radio_button)

        format_toggle_layout.addWidget(self.xml_radio_button)
        format_toggle_layout.addWidget(self.markdown_radio_button)
        format_toggle_layout.addWidget(self.plain_radio_button)
        middle_section_layout.addLayout(format_toggle_layout)

        # Pattern Filters
        include_patterns_layout = QHBoxLayout()
        include_label = QLabel("Include Patterns:")
        self.include_patterns_input = QLineEdit()
        self.include_patterns_input.setPlaceholderText("e.g., *.py, src/**/*.js")
        self.include_patterns_input.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        include_patterns_layout.addWidget(include_label)
        include_patterns_layout.addWidget(self.include_patterns_input)
        middle_section_layout.addLayout(include_patterns_layout)

        ignore_patterns_layout = QHBoxLayout()
        ignore_label = QLabel("Ignore Patterns:")
        self.ignore_patterns_input = QLineEdit()
        self.ignore_patterns_input.setPlaceholderText("e.g., *.txt, build/, dist/")
        self.ignore_patterns_input.setSizePolicy(QSizePolicy.Expanding, QSizePolicy.Preferred)
        ignore_patterns_layout.addWidget(ignore_label)
        ignore_patterns_layout.addWidget(self.ignore_patterns_input)
        middle_section_layout.addLayout(ignore_patterns_layout)
        
        middle_section_group_box.setSizePolicy(QSizePolicy.Preferred, QSizePolicy.Preferred) # Changed to Preferred for vertical
        center_horizontal_layout.addWidget(middle_section_group_box, 1) # Add stretch factor for middle section

        # Right Panel Section (Options)
        right_panel_group_box = QGroupBox("Options")
        right_panel_group_box.setFixedWidth(280) # Adjusted fixed width
        right_panel_main_layout = QVBoxLayout(right_panel_group_box)

        # Output Format Options Sub-Group
        output_format_options_group = QGroupBox("Output Format Options")
        output_options_layout = QVBoxLayout(output_format_options_group)
        
        self.file_summary_checkbox = QCheckBox("File summary")
        self.dir_structure_checkbox = QCheckBox("Directory structure")
        self.line_numbers_checkbox = QCheckBox("Line numbers")
        self.parsable_format_checkbox = QCheckBox("Parsable format")

        output_options_layout.addWidget(self.file_summary_checkbox)
        output_options_layout.addWidget(self.dir_structure_checkbox)
        output_options_layout.addWidget(self.line_numbers_checkbox)
        output_options_layout.addWidget(self.parsable_format_checkbox)
        right_panel_main_layout.addWidget(output_format_options_group)

        # File Processing Options Sub-Group
        file_processing_options_group = QGroupBox("File Processing Options")
        processing_options_layout = QVBoxLayout(file_processing_options_group)

        self.compress_code_checkbox = QCheckBox("Compress code")
        self.remove_comments_checkbox = QCheckBox("Remove comments")
        self.remove_empty_lines_checkbox = QCheckBox("Remove empty lines")

        processing_options_layout.addWidget(self.compress_code_checkbox)
        processing_options_layout.addWidget(self.remove_comments_checkbox)
        processing_options_layout.addWidget(self.remove_empty_lines_checkbox)
        right_panel_main_layout.addWidget(file_processing_options_group)

        # right_panel_group_box.setSizePolicy(QSizePolicy.Maximum, QSizePolicy.Preferred)
        center_horizontal_layout.addWidget(right_panel_group_box, 0) # No stretch for right panel

        main_layout.addLayout(center_horizontal_layout)
        # main_layout.addStretch(1) # Removed stretch, rely on panel sizing

        self.apply_stylesheet() # Apply custom stylesheet

    def on_pack_button_clicked(self):
        print("Pack button clicked! (Placeholder)")
        # Future logic will gather all selected options and input path
        # and then trigger the core packing logic.

    def apply_stylesheet(self):
        stylesheet = """
            QGroupBox {
                border-radius: 8px;
                border: 1px solid #4a4a4a; /* Slightly lighter border for dark theme */
                margin-top: 12px; /* Increased margin for title */
                padding-top: 10px; /* Padding inside the groupbox, below title */
            }
            QGroupBox::title {
                subcontrol-origin: margin;
                subcontrol-position: top center;
                padding: 0 5px;
                background-color: #535353; /* Match window background for seamless look */
                color: white;
                border-radius: 4px; /* Rounded corners for title background */
            }
            QPushButton {
                border-radius: 5px;
                padding: 6px 12px; /* Slightly more padding */
                background-color: #636363; /* Darker buttons */
                color: white;
                border: 1px solid #555;
            }
            QPushButton:hover {
                background-color: #737373; /* Lighter on hover */
            }
            QPushButton:pressed {
                background-color: #5a5a5a; /* Darker when pressed */
            }
            #PackButton {
                background-color: #0078d7; /* Prominent blue */
                color: white;
                font-weight: bold;
            }
            #PackButton:hover {
                background-color: #005fa3;
            }
            #PackButton:pressed {
                background-color: #004c8c;
            }
            QLineEdit {
                border-radius: 5px;
                padding: 6px;
                border: 1px solid #4a4a4a;
                background-color: #3a3a3a; /* Darker input fields */
                color: white;
            }
            QRadioButton, QCheckBox {
                spacing: 5px; /* Spacing between button and text */
            }
            QRadioButton::indicator, QCheckBox::indicator {
                width: 16px; /* Larger indicators */
                height: 16px;
            }
            QLabel {
                padding-top: 4px; /* Align labels better with input fields */
            }
        """
        self.setStyleSheet(stylesheet)

    def apply_dark_theme(self):
        dark_palette = QPalette()

        # Window and text
        dark_palette.setColor(QPalette.Window, QColor(53, 53, 53))
        dark_palette.setColor(QPalette.WindowText, Qt.white)

        # Base and alternate base
        dark_palette.setColor(QPalette.Base, QColor(25, 25, 25))
        dark_palette.setColor(QPalette.AlternateBase, QColor(53, 53, 53))

        # Tooltip
        dark_palette.setColor(QPalette.ToolTipBase, Qt.white)
        dark_palette.setColor(QPalette.ToolTipText, Qt.white)

        # Text and button text
        dark_palette.setColor(QPalette.Text, Qt.white)
        dark_palette.setColor(QPalette.ButtonText, Qt.white)

        # Button
        dark_palette.setColor(QPalette.Button, QColor(53, 53, 53))

        # Highlight and highlighted text
        dark_palette.setColor(QPalette.Highlight, QColor(42, 130, 218))
        dark_palette.setColor(QPalette.HighlightedText, Qt.black)

        QApplication.instance().setPalette(dark_palette)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    window = MainWindow()
    window.show()
    sys.exit(app.exec())
