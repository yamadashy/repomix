---
title: "Meilleures pratiques de développement assisté par IA : De mon expérience"
description: "Conseils pratiques de développement assisté par IA pour exploiter le code existant, l'implémentation modulaire, les tests, la planification et le partage de contexte avec Repomix."
---

# Meilleures pratiques de développement assisté par IA : De mon expérience

Bien que je n'aie pas encore réussi à mener à bien un projet à grande échelle en utilisant l'IA, je souhaite partager ce que j'ai appris jusqu'à présent de mon expérience de travail avec l'IA dans le développement.

## Approche de développement de base

Lorsque l'on travaille avec l'IA, tenter d'implémenter toutes les fonctionnalités en une fois peut conduire à des problèmes inattendus et à une stagnation du projet. C'est pourquoi il est plus efficace de commencer par les fonctionnalités principales et de construire chaque fonctionnalité une par une, en s'assurant d'une implémentation solide avant d'avancer.

### La puissance du code existant

Cette approche est efficace car l'implémentation des fonctionnalités principales vous permet de matérialiser votre design idéal et votre style de codage à travers du code réel. La manière la plus efficace de communiquer votre vision du projet est à travers du code qui reflète vos standards et préférences.

En commençant par les fonctionnalités principales et en s'assurant que chaque composant fonctionne correctement avant de passer à la suite, l'ensemble du projet maintient sa cohérence, rendant plus facile pour l'IA de générer du code plus approprié.

## L'approche modulaire

La décomposition du code en modules plus petits est cruciale. D'après mon expérience, maintenir les fichiers autour de 250 lignes de code rend plus facile de donner des instructions claires à l'IA et rend le processus d'essai-erreur plus efficace. Bien que le nombre de tokens serait une métrique plus précise, le nombre de lignes est plus pratique pour les développeurs humains, nous utilisons donc cela comme ligne directrice.

Cette modularisation ne consiste pas seulement à séparer les composants frontend, backend et base de données - il s'agit de décomposer les fonctionnalités à un niveau beaucoup plus fin. Par exemple, au sein d'une même fonctionnalité, vous pourriez séparer la validation, la gestion des erreurs et d'autres fonctionnalités spécifiques en modules distincts. Bien sûr, la séparation de haut niveau est également importante, et implémenter cette approche modulaire progressivement aide à maintenir des instructions claires et permet à l'IA de générer du code plus approprié. Cette approche est efficace non seulement pour l'IA mais aussi pour les développeurs humains.

## Assurer la qualité par les tests

Je considère que les tests sont cruciaux dans le développement assisté par IA. Les tests servent non seulement de mesures d'assurance qualité mais aussi de documentation qui démontre clairement les intentions du code. Lorsque vous demandez à l'IA d'implémenter de nouvelles fonctionnalités, le code de test existant agit efficacement comme un document de spécification.

Les tests sont également un excellent outil pour valider l'exactitude du code généré par l'IA. Par exemple, lorsque vous faites implémenter une nouvelle fonctionnalité pour un module par l'IA, écrire des cas de test au préalable vous permet d'évaluer objectivement si le code généré se comporte comme prévu. Cela s'aligne bien avec les principes du Développement Piloté par les Tests (TDD) et est particulièrement efficace lors de la collaboration avec l'IA.

## Équilibrer planification et implémentation

Avant d'implémenter des fonctionnalités à grande échelle, je recommande de d'abord discuter du plan avec l'IA. Organiser les exigences et réfléchir à l'architecture conduit à une implémentation plus fluide. Une bonne pratique consiste à compiler d'abord les exigences, puis passer à une session de chat séparée pour le travail d'implémentation.

Il est essentiel que les humains examinent la sortie de l'IA et fassent des ajustements si nécessaire. Bien que la qualité du code généré par l'IA soit généralement modérée, cela accélère tout de même le développement par rapport à l'écriture de tout à partir de zéro.

## Conclusion

En suivant ces pratiques, vous pouvez exploiter les points forts de l'IA tout en construisant une base de code cohérente et de haute qualité. Même lorsque votre projet grandit en taille, chaque composant reste bien défini et gérable.
