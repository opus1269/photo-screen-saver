module.exports = {
	'extends': [
		'eslint:recommended',
		'google',
	],

	'env': {
		'browser': true,
	},

	'plugins': [
		'html'
	],

	'globals': {
		'require': true,
		'chrome': true,
		'runtime': true,
		'wrap': true,
		'unwrap': true,
		'Polymer': true,
		'Platform': true,
		'gapi': true,
		'self': true,
		'clients': true,
		'myUtils': true,
		'bgUtils': true,
		'chromeCast': true,
		'GooglePhotosPage': true,
		'FaqPage': true,
		'InfoPage': true,
		'gPhotos': true,
		'use500px': true,
		'photoSources': true,
		'flickr': true,
		'Snoocore': true,
		'reddit': true,
		'ga': true,
	},

	'rules': {
		'linebreak-style': ['off', 'windows'],
		'max-len': ['warn', 180],
		'no-var': 'off',
		'no-console': 'warn',
		'no-unused-vars': 'warn',
		'comma-dangle': ['off', 'always'],
		'no-trailing-spaces': 'off',
		'padded-blocks': 'off',
		'require-jsdoc': 'warn',
		'new-cap': ['error', {'capIsNewExceptions': ['Polymer']}],
		'quotes': ['error', 'single'],
		'quote-props': ['error', 'consistent'],
		'prefer-rest-params': 'off',
	},
};
