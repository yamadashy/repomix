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
