// Multiple interfaces
public class MultiImpl : IDisposable, IComparable, ICloneable {
  // Dispose method
  public void Dispose() {
    Console.WriteLine("Disposing");
  }

  // CompareTo method
  public int CompareTo(object obj) {
    return 0;
  }

  // Clone method
  public object Clone() {
    return this.MemberwiseClone();
  }
}
