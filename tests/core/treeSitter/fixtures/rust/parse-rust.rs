// Module declaration
mod greetings {
    // Trait definition
    pub trait Greeter {
        /// Says hello to someone
        fn greet(&self, name: &str) -> String;
    }

    // Struct definition
    #[derive(Debug)]
    pub struct SimpleGreeter {
        prefix: String
    }

    // Implementation block
    impl Greeter for SimpleGreeter {
        fn greet(&self, name: &str) -> String {
            format!("{}, {}!", self.prefix, name)
        }
    }

    // Enum definition
    #[derive(Debug)]
    pub enum Language {
        English,
        Japanese,
        Spanish
    }

    // Main function
    fn main() {
        let greeter = SimpleGreeter {
            prefix: String::from("Hello")
        };
        println!("{}", greeter.greet("World"));
    }
}
