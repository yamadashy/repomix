/* Function declaration */
void print_message(const char* message);

/* Function definition */
int calculate_sum(int values[], int count) {
  int sum = 0;
  for (int i = 0; i < count; i++) {
    sum += values[i];
  }
  return sum;
}

/* Function with no params */
void init(void) {
  // Initialize something
}
