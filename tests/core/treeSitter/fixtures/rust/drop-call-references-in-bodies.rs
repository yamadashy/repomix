struct Inventory {
    items: Vec<String>,
}

impl Inventory {
    fn add(&mut self, item: String) {
        validate(&item);
        self.items.push(item);
        println!("added");
    }
}
