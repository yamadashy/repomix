@dataclass
@register
class UserModel(BaseModel):
    name: str
    age: int
