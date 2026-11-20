import java.util.ArrayList;
import java.util.List;

public class Inventory {
  private List<String> items = new ArrayList<>();

  public void add(String item) {
    Validator validator = new Validator();
    validator.check(item);
    items.add(item);
  }
}
