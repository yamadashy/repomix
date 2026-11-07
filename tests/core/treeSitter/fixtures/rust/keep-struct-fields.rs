/// A user account
pub struct User {
    /// Unique id
    pub id: u64,
    pub(crate) name: String,
    email: Option<String>,
}

union IntOrFloat {
    i: u32,
    f: f32,
}

fn build() -> User {
    let user = User { id: 1, name: String::new(), email: None };
    user
}

pub struct Cache {
    entries: std::collections::HashMap<
        // cache key
        String,
        Vec<u8>,
    >,
}

pub trait Store {
    fn get(
        &self,
        // lookup key
        key: &str,
    ) -> Option<Vec<u8>>;
}
