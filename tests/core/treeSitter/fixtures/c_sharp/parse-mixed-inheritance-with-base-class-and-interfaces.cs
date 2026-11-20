// Base class
public class Animal {
  public virtual void Speak() {
    Console.WriteLine("Animal speaks");
  }
}

// Interface for movement
public interface IMovable {
  void Move();
}

// Interface for sound
public interface IAudible {
  void Hear();
}

// Mixed inheritance: base class + multiple interfaces
public class Dog : Animal, IMovable, IAudible {
  // Override Speak from Animal
  public override void Speak() {
    Console.WriteLine("Dog barks");
  }

  // Implementation of IMovable
  public void Move() {
    Console.WriteLine("Dog runs");
  }

  // Implementation of IAudible
  public void Hear() {
    Console.WriteLine("Dog listens");
  }
}
