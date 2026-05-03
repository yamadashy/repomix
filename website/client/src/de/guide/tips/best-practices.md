---
title: "Best Practices für KI-unterstützte Entwicklung: Aus meiner Erfahrung"
description: "Praktische Tipps zur KI-unterstützten Entwicklung mit vorhandenem Code, modularer Umsetzung, Tests, Planung und kontextreicher Zusammenarbeit mit Repomix."
---

# Best Practices für KI-unterstützte Entwicklung: Aus meiner Erfahrung

Obwohl ich noch kein großes Projekt mit KI erfolgreich abgeschlossen habe, möchte ich meine bisherigen Erfahrungen in der Entwicklung mit KI teilen.

## Grundlegender Entwicklungsansatz

Bei der Arbeit mit KI kann der Versuch, alle Funktionen auf einmal zu implementieren, zu unerwarteten Problemen und Projektstillstand führen. Deshalb ist es effektiver, mit der Kernfunktionalität zu beginnen und jede Funktion einzeln aufzubauen, wobei eine solide Implementierung sichergestellt wird, bevor man weitermacht.

### Die Kraft des bestehenden Codes

Dieser Ansatz ist effektiv, weil die Implementierung der Kernfunktionalität es Ihnen ermöglicht, Ihr ideales Design und Ihren Codierungsstil durch tatsächlichen Code zu materialisieren. Der effektivste Weg, Ihre Projektvision zu kommunizieren, ist durch Code, der Ihre Standards und Präferenzen widerspiegelt.

Indem Sie mit Kernfunktionen beginnen und sicherstellen, dass jede Komponente richtig funktioniert, bevor Sie weitergehen, behält das gesamte Projekt seine Konsistenz, was es der KI erleichtert, angemesseneren Code zu generieren.

## Der modulare 

Ansatz
Code in kleinere Module aufzuteilen ist entscheidend. Nach meiner Erfahrung macht es die Begrenzung von Dateien auf etwa 250 Codezeilen einfacher, der KI klare Anweisungen zu geben und den Versuch-und-Irrtum-Prozess effizienter zu gestalten. Während die Token-Anzahl ein genaueres Maß wäre, ist die Zeilenanzahl für menschliche Entwickler praktischer, daher verwenden wir diese als Richtlinie.

Diese Modularisierung beschränkt sich nicht nur auf die Trennung von Frontend, Backend und Datenbankkomponenten - es geht darum, die Funktionalität auf einer viel feineren Ebene aufzuteilen. Zum Beispiel könnten Sie innerhalb einer einzelnen Funktion die Validierung, Fehlerbehandlung und andere spezifische Funktionalitäten in separate Module aufteilen.

## Qualitätssicherung durch Tests

Ich halte Tests für entscheidend in der KI-unterstützten Entwicklung. Tests dienen nicht nur als Qualitätssicherungsmaßnahmen, sondern auch als Dokumentation, die die Codeabsichten klar demonstriert. Wenn Sie die KI bitten, neue Funktionen zu implementieren, fungiert der bestehende Testcode effektiv als Spezifikationsdokument.

Tests sind auch ein ausgezeichnetes Werkzeug zur Validierung der Korrektheit von KI-generiertem Code. Wenn Sie beispielsweise die KI neue Funktionalität für ein Modul implementieren lassen, ermöglicht das vorherige Schreiben von Testfällen eine objektive Bewertung, ob der generierte Code wie erwartet funktioniert.

## Balance zwischen Planung und Implementierung

Bevor Sie umfangreiche Funktionen implementieren, empfehle ich, zunächst den Plan mit der KI zu besprechen. Die Organisation von Anforderungen und die Berücksichtigung der Architektur führen zu einer reibungsloseren Implementierung. Eine gute Praxis ist es, zuerst die Anforderungen zusammenzustellen und dann zu einer separaten Chat-Sitzung für die Implementierungsarbeit überzugehen.

## Fazit

Durch die Befolgung dieser Praktiken können Sie die Stärken der KI nutzen und gleichzeitig eine konsistente, hochwertige Codebasis aufbauen. Selbst wenn Ihr Projekt wächst, bleibt jede Komponente gut definiert und handhabbar. 
