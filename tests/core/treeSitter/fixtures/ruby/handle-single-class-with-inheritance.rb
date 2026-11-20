class Admin < User
  # Admin has higher privileges
  def admin?
    true
  end
end
