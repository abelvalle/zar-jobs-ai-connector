# Comparación de salario y condiciones

El comparador estructura datos que el usuario extrae de una oferta y conserva una cita literal por condición. No extrae automáticamente, consulta portales, convierte divisas ni estima impuestos.

## Herramientas

- `review_offer_conditions`: revisa una oferta y separa condiciones confirmadas, desconocidas y no verificadas.
- `compare_offer_conditions`: construye una matriz para entre 2 y 10 ofertas y calcula comparaciones limitadas.

## Evidencia

Cada valor necesita una entrada homónima en `evidence`. La cita debe aparecer literalmente en `sourceText`. Para salario, porcentaje variable, días remotos, horas, vacaciones y desplazamiento, el número aportado también debe aparecer en la cita.

Una coincidencia literal no prueba que la oferta siga activa ni que la interpretación legal sea correcta. La herramienta no devuelve el texto completo de origen.

## Salario

La compensación conserva:

- mínimo y máximo;
- código de divisa de tres letras;
- periodo anual, mensual u horario;
- base bruta, neta o desconocida.

Un salario mensual solo se anualiza cuando se aporta `paymentsPerYear`. Un salario horario necesita `hoursPerWeek` y `weeksPerYear`. Estos multiplicadores quedan visibles como supuestos explícitos.

Las ofertas solo se comparan dentro del mismo grupo de divisa y base bruta/neta. No hay tipos de cambio, cálculo fiscal, inflación ni valoración monetaria de beneficios.

## Matriz y líderes

La matriz conserva condiciones confirmadas y deja `null` o `unknown` cuando falta evidencia. Los líderes de remoto, vacaciones, horas y desplazamiento son simples máximos o mínimos entre valores confirmados. No constituyen un ranking general ni una decisión de empleo.
