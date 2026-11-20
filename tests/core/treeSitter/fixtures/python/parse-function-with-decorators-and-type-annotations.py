@route("/users")
@authenticate
def get_users(page: int = 1, limit: int = 10) -> List[User]:
    return users[page:limit]
