// Package main is the entry point
package main

import (
  "fmt"
  "os"
)

// User represents a person
type User struct {
  Name string
  Age  int
}

// Greeter is something that can greet
type Greeter interface {
  Greet() string
}

// Constants
const (
  MaxUsers = 100
  Version  = "1.0.0"
)

// Variables
var (
  debugMode = false
  logLevel  = "info"
)

// SayHello prints a greeting message
func SayHello(name string) {
  fmt.Printf("Hello, %s!\n", name)
}

// Greet implements the Greeter interface
func (u User) Greet() string {
  return fmt.Sprintf("Hello, I'm %s!", u.Name)
}

// Main entry point
func main() {
  user := User{Name: "John", Age: 30}
  fmt.Println(user.Greet())
  SayHello(os.Args[1])
}
