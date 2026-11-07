public class Inventory {
  private Repository repository;

  public void Add(string item) {
    Validator validator = new Validator();
    validator.Check(item);
    repository.Save(item);
  }
}
