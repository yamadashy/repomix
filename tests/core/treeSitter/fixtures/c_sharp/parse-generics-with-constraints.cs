// Generic with class constraint
public class GenericClass<T> where T : class {
  public T Value { get; set; }
}

// Multiple constraints
public class MultiConstraint<T, U>
  where T : IComparable<T>
  where U : new() {

  public void Method<V>(V item) where V : struct {
    Console.WriteLine(item);
  }
}
