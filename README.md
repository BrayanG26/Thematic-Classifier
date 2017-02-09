# Thematic-Classifier
Thematic Classifier for WAB of Arcgis. You can render the layers that you want based in some attribute.
Depending if layer is polygon, point or polyline, the symbol is changed. And depending if the field used for render is domain or not, it choose between 'ClassBreaksRenderer' or 'UniqueValueRenderer'

##### Instructions
You can clone the repositorie in widgets folder, in your aplicattion or project.
Then, add it with the edition mode in WAB.

The widget has been thought-out to work of this way.
- Takes the layers in your web map (organized in 'levels')
- It fills the first select with the parents layer
- It Let you go through the layer until come to final, which has the fields.
- Finally, you choose the field, and if this is domain type or not, it will apply 'ClassBreaksRenderer' or 'UniqueValueRenderer'.
