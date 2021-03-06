# Modifying the landing page

We can adapt the landing page for signature commons by modifying two json files in the ui-schemas [landing-ui.json](../../examples/dashboard/landing_ui.json) and [ui.json](../../examples/dashboard/ui.json).

![alt text](../../static/sigcom-landing.png)

## Setting fields to count
We can tell the UI which keys to count by creating a database entry on the schema table with this validator: ```/dcic/signature-commons-schema/v5/meta/schema/counting.json```

The following table describe the fields for each entry

| Field         | Value           | Remarks |
| ------------- |---------------| ----------|
| Field_Name     | string          | Name of the meta field in the database|
| Type           | string          | type of the field in the database (string, object)|
| Table | string | Name of the field's table |
| Preferred_Name | string          |Display name of the field|
| Preferred_Name_Singular | string          |Used for pie chart captions|
| Slice | int          |Used to tell how many slices to use for the piecharts|
| MDI_Icon | string | Display icon (see [mdi-icon](https://materialdesignicons.com/) for more information) |
| Meta_Count | boolean | Tells the UI to display the field as part of the meta counts |
| Pie_Count | boolean | Tells the UI to display the field as part of the pie charts |
| Bar_Count | boolean | Tells the UI to display the field as part of the bar charts |
| Table_Count | boolean | Tells the UI to display this as part of the table counts |
| Visible_On_Landing | boolean | If Table_Count is true and this is true, the UI will display the stat on the landing page|
| Visible_On_Admin | boolean | If Table_Count is true and this is true, the UI will display the stat on the Admin page|

Sample entries can be found on [examples folder](../../examples/dashboard). Relevant files are named as ```counting_ui_*.json```. Note that each object in the list is an entry.
```
{
    id: some-uuid-here-to-display,
    meta: {
        # Place values here
    }
}
```

## Changing text content in the page
We can tell the UI which keys to count by creating a database entry on the schema table with this validator: ```/dcic/signature-commons-schema/v5/meta/schema/landing-ui.json```

The following table describe the fields for each entry

| Field         | Value           | Remarks |
| ------------- |---------------| ----------|
| landing | boolean | Use this ui for the landing page|
| admin | boolean | Use this ui for the admin page|
| content | object | You place your modifications here (see below) |

### Content field
Refer to the image above for more information.

| Field         | Value           | Remarks |
| ------------- |---------------| ----------|
| library_name | string | The field that we'll use as the library name (required) |
| resource_name | string | The field that we'll use as the resource name |
| resource_name_from_library | string | Alternatively, if resource table is empty, we can use this field to define which meta field in the library to use. Otherwise, we'll use the library's dataset as resource name |
| resource_icon | string | location of the icon in the metadata |
| signature_search | boolean | tells the UI whether signature_search is activated |
| metadata_search | boolean | tells the UI whether metadata_search is activated |
| resources | boolean | tells the UI whether resources is activated |
| resource_list_style | object | JSS styling for resource page |
| header | string | Header of the UI (Default: Signature Commons) |
| metadata_placeholder | string | Placeholder for the metadata search box |
| geneset_placeholder | string | Placeholder for the geneset search box |
| up_genes_placeholder | string | Placeholder for the up genes search box |
| down_genes_placeholder | string | Placeholder for the down genes search box |
| search_terms | array | Chip terms for metadata search |
| geneset_terms | string | Tab-delimited gene terms for geneset search |
| weighted_geneset_terms | string | Tab-delimited gene weighted terms for geneset search |
| up_set_terms | string | Tab-delimited gene terms for up geneset |
| down_set_terms | string | Tab-delimited gene terms for down geneset search |
| text_1 | string | Text for text_1 |
| text_2 | string | Text for text_2 |
| text_3 | string | Text for text_3 |
| text_4 | string | Text for text_4 |
| resource_pie_caption | string | Caption for resource pie chart |
| bar_chart | object | Controls the barcharts |
| counting_validator | string | Name of the counting validator to use |
| ui_schema| string | name of ui_schema validator to use |
|deactivate_download | boolean | deactivate downloads for this instance|
|deactivate_wordcloud | boolean | deactivate word cloud for this instance|
| bar_chart_style | object | props to pass to rechart (see rechart, ../../util/ui_values.js and ../../examples/dashboard for examples)|
| pie_chart_style | object | props to pass to rechart (see rechart, ../../util/ui_values.js and ../../examples/dashboard for examples)|
|maxResourcesToShow|int|The number of resources triggering More/Less activation at all|
|maxResourcesToShow|number|The maximum resources to show before collapsing if More/Less is activated|
The bar_chart an object with the following fields

| Field         | Value           | Remarks |
| ------------- |---------------| ----------|
| Field_Name | string | Name of the field to create a bar chart (recall that we have a Bar_Count field in the landing-ui.json, we choose which field to construct a bar graph with this field)|
| Caption | string | Caption of the bargraph |

Sample entries can be found on [examples folder](../../examples/dashboard). Relevant files are named as ```ui_*.json```. Note that each object in the list is an entry.
```
{
    id: some-uuid-here-to-display,
    meta: {
        # Place values here
    }
}
```
