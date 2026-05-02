---
title: "AI-Assisted Development Best Practices: From My Experience"
description: Practical AI-assisted development tips for using existing code, modular implementation, tests, planning, and Repomix-based context sharing.
---

# AI-Assisted Development Best Practices: From My Experience

While I haven't successfully completed a large-scale project using AI yet, I'd like to share what I've learned so far from my experience working with AI in development.

## Basic Development Approach

When working with AI, attempting to implement all features at once can lead to unexpected issues and project stagnation. That's why it's more effective to start with core functionality and build each feature one at a time, ensuring solid implementation before moving forward.

### The Power of Existing Code

This approach is effective because implementing core functionality allows you to materialize your ideal design and coding style through actual code. The most effective way to communicate your project vision is through code that reflects your standards and preferences.

By starting with core features and ensuring each component works properly before moving on, the entire project maintains consistency, making it easier for AI to generate more appropriate code.

## The Modular Approach

Breaking code into smaller modules is crucial. In my experience, keeping files around 250 lines of code makes it easier to give clear instructions to AI and makes the trial-and-error process more efficient. While token count would be a more accurate metric, line count is more practical for human developers to work with, so we use that as a guideline.

This modularization isn't just about separating frontend, backend, and database components - it's about breaking down functionality at a much finer level. For example, within a single feature, you might separate validation, error handling, and other specific functionalities into distinct modules. Of course, high-level separation is also important, and implementing this modular approach gradually helps maintain clear instructions and enables AI to generate more appropriate code. This approach is effective not just for AI but for human developers as well.

## Ensuring Quality Through Testing

I consider testing to be crucial in AI-assisted development. Tests serve not only as quality assurance measures but also as documentation that clearly demonstrates code intentions. When asking AI to implement new features, existing test code effectively acts as a specification document.

Tests are also an excellent tool for validating the correctness of AI-generated code. For instance, when having AI implement new functionality for a module, writing test cases beforehand allows you to objectively evaluate whether the generated code behaves as expected. This aligns well with Test-Driven Development (TDD) principles and is particularly effective when collaborating with AI.

## Balancing Planning and Implementation

Before implementing large-scale features, I recommend first discussing the plan with AI. Organizing requirements and considering architecture leads to smoother implementation. A good practice is to compile requirements first, then move to a separate chat session for implementation work.

It's essential to have human review of AI output and make adjustments as needed. While the quality of AI-generated code is generally moderate, it still accelerates development compared to writing everything from scratch.

## Conclusion

By following these practices, you can leverage AI's strengths while building a consistent, high-quality codebase. Even as your project grows in size, each component remains well-defined and manageable.
