<?php

namespace App;

use App\Greeter;

// Define the greeting function
function greet($name) {
    // Print the personalized greeting message
    echo "Hello, " . $name . "!";
}

// Execute the greeting function
greet("John");

interface Greeter {
  public function greet($name);
}

final class GreeterImpl implements Greeter {
  public function greet($name) {
    echo "Hello, " . $name . "!";
  }
}

trait GreeterTrait {
  public function greet($name) {
    echo "Hello, " . $name . "!";
  }
}

/**
 * Greeting function
 * @param name The name to greet
 * @return string The greeting message
 */
enum GreeterEnum: string {
  case GREET = "Hello, %s!";
}

?>
