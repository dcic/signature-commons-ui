import React from 'react'
import PropTypes from 'prop-types'
import Card from '@material-ui/core/Card'
import CardHeader from '@material-ui/core/CardHeader'
import Collapse from '@material-ui/core/Collapse';
import IconButton from '@material-ui/core/IconButton';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import CircularProgress from '@material-ui/core/CircularProgress'

export const Filter = (props) => {
	const {
		name,
		icon,
		values,
		checked,
		onClick,
		loading,
	} = props

	const [expanded, setExpanded] = React.useState(false);
	const handleExpandClick = () => {
		setExpanded(!expanded);
	};
	if (loading){
		return (
			<Card>
				<CardHeader
					avatar={<span className={`mdi ${icon} mdi-48px`}></span>}
					action={<CircularProgress />}
					title={name}
				/>
			</Card>
		)
	}

	return (
		<Card>
			<CardHeader
				avatar={<span className={`mdi ${icon} mdi-48px`}></span>}
				action={
					<IconButton
						onClick={handleExpandClick}
						aria-expanded={expanded}
						aria-label="show more"
					>
						<span className={`mdi ${expanded ? "chevron-up": "chervron-down"} mdi-36px`}></span>
					</IconButton>
				}
				title={name}
			/>
			<Collapse in={expanded} timeout="auto" unmountOnExit>
				<FormGroup>
					{Object.entries(values).map(([label, count])=>
						<FormControlLabel
							control={<Checkbox checked={checked[label]} onChange={onClick} name={label} />}
							label={`${label} (${count})`}
						/>
					)}
				</FormGroup>
			</Collapse>
		</Card>
	)
}

Filter.propTypes = {
	name: PropTypes.string,
	icon: PropTypes.string,
	values: PropTypes.objectOf(PropTypes.number),
	checked: PropTypes.objectOf(PropTypes.bool),
	onClick: PropTypes.func,
	loading: PropTypes.bool,
}