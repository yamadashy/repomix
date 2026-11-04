/* Simple typedef */
typedef unsigned long size_t;

/* Struct typedef */
typedef struct {
  double x;
  double y;
} Point;

/* Enum typedef */
typedef enum {
  RED,
  GREEN,
  BLUE
} Color;

/* Function pointer typedef */
typedef void (*Callback)(void* data);

/* Array typedef */
typedef char String[256];
