module Searchable
  extend ActiveSupport::Concern

  included do
    scope :recent, -> { order(created_at: :desc) }
  end
end

class Author < ApplicationRecord
  has_many :books
  validates :name, presence: true

  def display_name
    format_name(name)
  end
end

class Publisher < ApplicationRecord
  has_many :books,
           class_name: "Book",
           dependent: :destroy
end

class Order < ApplicationRecord
  before_save do
    notify_admin(self)
  end
end

class Account < ApplicationRecord
  with_options presence: true do
    validates :email
  end
end
