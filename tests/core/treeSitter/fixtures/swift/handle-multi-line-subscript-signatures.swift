protocol Grid {
  subscript(
    row: Int,
    column: Int
  ) -> Double { get set }
}

class Matrix {
  subscript(
    row: Int,
    column: Int
  ) -> Double {
    get { return 0 }
    set { }
  }
}

enum Board {
  case empty

  subscript(
    row: Int,
    column: Int
  ) -> Int {
    return 0
  }
}
