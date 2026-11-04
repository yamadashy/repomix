/**
 * A simple C program demonstrating various language features
 */
#include <stdio.h>
#include <stdlib.h>

/* Define a constant */
#define MAX_SIZE 100

/**
 * Structure representing a person
 */
struct Person {
  char* name;
  int age;
};

/**
 * Union for different number types
 */
union Number {
  int i;
  float f;
  double d;
};

/**
 * Enum for status codes
 */
enum Status {
  SUCCESS = 0,
  ERROR = 1,
  PENDING = 2
};

/* Type definition for a pointer to function returning int */
typedef int (*IntFunctionPtr)(int, int);

/**
 * Add two integers
 * @param a First integer
 * @param b Second integer
 * @return Sum of a and b
 */
int add(int a, int b) {
  // Add two numbers
  return a + b;
}

/**
 * Main function
 * @return Exit status
 */
int main(int argc, char** argv) {
  // Create a person
  struct Person person;
  person.name = "John";
  person.age = 30;

  // Print info
  printf("Name: %s, Age: %d\n", person.name, person.age);

  // Use union
  union Number num;
  num.i = 42;
  printf("Integer: %d\n", num.i);

  // Function pointer
  IntFunctionPtr operation = add;
  printf("Result: %d\n", operation(5, 3));

  return SUCCESS;
}
